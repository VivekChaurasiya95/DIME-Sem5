"""
DIME Backend - Celery Tasks.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from uuid import UUID
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from backend.core.database import async_session_factory, engine
from backend.ingestion.cleanup import cleanup_expired_intelligence
from backend.ingestion.pipeline import DocumentPipeline
from backend.models.analysis import Analysis, AnalysisStatus
from backend.models.evidence import SourceChunk, SourceDocument
from backend.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

_embedding_provider = None
_qdrant_store = None

def get_embedding_provider() -> Any:
    global _embedding_provider
    if _embedding_provider is None:
        from backend.core.embeddings import SentenceTransformerProvider
        _embedding_provider = SentenceTransformerProvider()
    return _embedding_provider

def get_qdrant_store() -> Any:
    global _qdrant_store
    if _qdrant_store is None:
        from backend.core.qdrant import QdrantStore
        provider = get_embedding_provider()
        _qdrant_store = QdrantStore(dimension=provider.dimension)
    return _qdrant_store


async def _run_analysis_pipeline_async(analysis_id: UUID) -> None:
    """
    Asynchronous implementation of the analysis pipeline.
    This will eventually orchestrate the LangGraph workflow.
    """
    logger.info(f"Starting analysis pipeline for analysis_id: {analysis_id}")
    
    async with async_session_factory() as session:
        # Load the analysis
        analysis = await session.get(Analysis, str(analysis_id))
        if not analysis:
            logger.error(f"Analysis {analysis_id} not found in database.")
            return

        if analysis.status == AnalysisStatus.COMPLETED:
            logger.info(f"Analysis {analysis_id} is already completed, skipping execution.")
            return

        try:
            # Transition to RUNNING
            from datetime import datetime, timezone
            analysis.status = AnalysisStatus.RUNNING
            analysis.current_stage = "STARTING"
            analysis.progress = 0
            if not analysis.started_at:
                analysis.started_at = datetime.now(timezone.utc)
            await session.commit()
            
            # Retrieve operational constraints from the Idea record if available
            idea_constraints: dict[str, Any] = {}
            if analysis.idea_id:
                try:
                    res = await session.execute(
                        text("""
                            SELECT "budget", "teamSize", "timeline", "preferredTechnologies", "formFactors", "analysisDepth"
                            FROM "Idea"
                            WHERE "id" = :idea_id
                        """),
                        {"idea_id": analysis.idea_id}
                    )
                    row = res.mappings().first()
                    if row:
                        idea_constraints = dict(row)
                except Exception as db_err:
                    logger.warning(f"Failed to query operational constraints for idea {analysis.idea_id}: {db_err}")

            from backend.workflow.graph import analysis_graph
            
            initial_state: dict[str, Any] = {
                "analysis_id": str(analysis_id),
                "idea": {
                    "id": analysis.idea_id,
                    "title": analysis.title,
                    "description": analysis.description,
                    "domain": analysis.domain,
                    "target_audience": analysis.target_audience,
                    "budget": idea_constraints.get("budget"),
                    "team_size": idea_constraints.get("teamSize"),
                    "teamSize": idea_constraints.get("teamSize"),
                    "timeline": idea_constraints.get("timeline"),
                    "preferred_technologies": idea_constraints.get("preferredTechnologies"),
                    "preferredTechnologies": idea_constraints.get("preferredTechnologies"),
                    "form_factors": idea_constraints.get("formFactors"),
                    "formFactors": idea_constraints.get("formFactors"),
                    "analysis_depth": idea_constraints.get("analysisDepth"),
                },
                "status": AnalysisStatus.RUNNING.value,
                "current_stage": "STARTING",
                "progress": 0,
                "evidence_references": [],
                "_raw_documents": None,
                "errors": []
            }
            
            async for step_result in analysis_graph.astream(initial_state):
                for node_name, state_update in step_result.items():
                    logger.info(f"Graph step completed: {node_name}")
                    
                    if "status" in state_update:
                        try:
                            analysis.status = AnalysisStatus(state_update["status"])
                            if analysis.status == AnalysisStatus.COMPLETED:
                                analysis.completed_at = datetime.now(timezone.utc)
                                # Persist real Notification on completion
                                if analysis.user_id and analysis.user_id != "anonymous":
                                    try:
                                        notif_id = f"notif_{uuid.uuid4().hex[:16]}"
                                        await session.execute(
                                            text("""
                                                INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "read", "createdAt")
                                                VALUES (:id, :userId, :title, :message, :type, false, :createdAt)
                                            """),
                                            {
                                                "id": notif_id,
                                                "userId": analysis.user_id,
                                                "title": "Analysis Completed",
                                                "message": f"Validation report ready for '{analysis.title or 'Your idea'}'",
                                                "type": "analysis_completed",
                                                "createdAt": datetime.now(timezone.utc),
                                            }
                                        )
                                    except Exception as notif_err:
                                        logger.warning(f"Failed to record completion notification: {notif_err}")
                        except ValueError:
                            pass
                    if "current_stage" in state_update:
                        analysis.current_stage = state_update["current_stage"]
                    if "progress" in state_update:
                        analysis.progress = state_update["progress"]
                    if "errors" in state_update and state_update["errors"]:
                        analysis.error_message = "; ".join(state_update["errors"])
                        
                    await session.commit()
            
            logger.info(f"Successfully completed workflow for analysis_id: {analysis_id}")
            
        except Exception as e:
            logger.exception(f"Error in analysis pipeline for {analysis_id}: {e}")
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = str(e)
            if analysis.user_id and analysis.user_id != "anonymous":
                try:
                    notif_id = f"notif_{uuid.uuid4().hex[:16]}"
                    await session.execute(
                        text("""
                            INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "read", "createdAt")
                            VALUES (:id, :userId, :title, :message, :type, false, :createdAt)
                        """),
                        {
                            "id": notif_id,
                            "userId": analysis.user_id,
                            "title": "Analysis Failed",
                            "message": f"Analysis for '{analysis.title or 'Your idea'}' encountered an error. You can retry from your workspace.",
                            "type": "analysis_failed",
                            "createdAt": datetime.now(timezone.utc),
                        }
                    )
                except Exception as notif_err:
                    logger.warning(f"Failed to record failure notification: {notif_err}")
            await session.commit()
            raise
        finally:
            # Dispose of the engine to clear the connection pool.
            # This prevents "Event loop is closed" errors when Celery 
            # runs multiple asyncio.run() calls across tasks.
            await engine.dispose()


@celery_app.task(name="worker.run_analysis_pipeline", bind=True, max_retries=3) # type: ignore
def run_analysis_pipeline(self: Any, analysis_id: str) -> str:
    """
    Celery task entry point to trigger the AI analysis pipeline.
    Because Celery is synchronous, we wrap the async pipeline in asyncio.run().
    """
    try:
        # Convert string UUID back to UUID object
        parsed_id = UUID(analysis_id)
        asyncio.run(_run_analysis_pipeline_async(parsed_id))
        return "SUCCESS"
    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        # Retry with exponential backoff (e.g., 60s, 120s, 240s)
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


async def _embed_and_store_document_async(document_id: str) -> None:
    """Embed chunks of a document and store them in Qdrant."""
    import uuid
    logger.info(f"Synchronizing document {document_id} to Qdrant...")
    
    qdrant = get_qdrant_store()
    await qdrant.ensure_collection()
    provider = get_embedding_provider()
    
    async with async_session_factory() as session:
        try:
            stmt = (
                select(SourceChunk)
                .options(selectinload(SourceChunk.document))
                .where(SourceChunk.document_id == document_id)
            )
            result = await session.execute(stmt)
            chunks = result.scalars().all()
            
            if not chunks:
                logger.info(f"No chunks found for document {document_id}")
                return
                
            texts = [c.content for c in chunks]
            vectors = provider.embed_batch(texts)
            
            point_ids = []
            payloads = []
            
            for chunk in chunks:
                pid = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{chunk.document_id}:{chunk.content_hash}:{chunk.chunk_index}"))
                point_ids.append(pid)
                
                payloads.append({
                    "document_id": chunk.document_id,
                    "chunk_id": chunk.id,
                    "source": chunk.document.source,
                    "source_id": chunk.document.source_id,
                    "canonical_url": chunk.document.source_url,
                    "title": chunk.document.title,
                    "chunk_index": chunk.chunk_index,
                    "content_hash": chunk.content_hash,
                    "retrieved_at": chunk.document.retrieved_at.isoformat() if chunk.document.retrieved_at else None,
                    "expires_at": chunk.document.expires_at.isoformat() if chunk.document.expires_at else None,
                })
                
            await qdrant.upsert_chunks(point_ids, vectors, payloads)
            logger.info(f"Successfully upserted {len(chunks)} chunks to Qdrant for document {document_id}")
        finally:
            await engine.dispose()

@celery_app.task(name="worker.embed_and_store_document", bind=True, max_retries=3) # type: ignore
def embed_and_store_document_task(self: Any, document_id: str) -> str:
    """Celery task to sync a document's chunks to Qdrant."""
    try:
        asyncio.run(_embed_and_store_document_async(document_id))
        return "SUCCESS"
    except Exception as exc:
        logger.error(f"Sync task failed for {document_id}: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))



async def _run_cleanup_async() -> int:
    """Async runner for cleanup task."""
    logger.info("Starting expired intelligence cleanup...")
    async with async_session_factory() as session:
        try:
            count = await cleanup_expired_intelligence(session)
            return count
        finally:
            await engine.dispose()


@celery_app.task(name="worker.cleanup_expired_intelligence")
def cleanup_task() -> str:
    """
    Celery task to periodically clean up expired SourceDocuments.
    Should be scheduled via Celery Beat.
    """
    try:
        count = asyncio.run(_run_cleanup_async())
        return f"Cleaned up {count} records."
    except Exception as exc:
        logger.error(f"Cleanup task failed: {exc}")
        raise
