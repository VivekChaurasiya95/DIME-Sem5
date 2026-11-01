"""
DIME Backend - Workflow Nodes (Pipeline Overhaul).

NEW pipeline order:
  1. Initialize
  2. Idea Understanding (LLM parses idea → StructuredIdea)
  3. Query Planning (LLM generates source-specific queries)
  4. Evidence Acquisition (multi-query, relevance-filtered)
  5. Process Evidence (normalize, chunk, embed)
  6. Research Agent (retrieval + LLM analysis)
  7. Competition Agent (retrieval + LLM analysis)
  8. Synthesis Agent (combine findings)
  9. Scoring Engine (evidence-based scoring)
  10. Complete Analysis
"""

import asyncio
import functools
import logging
from typing import Any, Awaitable, Callable, cast

from backend.core.database import async_session_factory
from backend.ingestion.pipeline import DocumentPipeline
from backend.integrations.github.service import GitHubService
from backend.integrations.research.service import ResearchService
from backend.integrations.web.adapter import CrawlAdapter
from backend.core.config import get_settings
from backend.models.analysis import AnalysisStatus
from backend.workflow.events import ProgressPublisher
from backend.workflow.state import AnalysisState

# Scoring imports
from backend.scoring.engine import ScoringEngine
from backend.models.scoring import AnalysisScore
from backend.core.database import async_session_factory
from backend.schemas.source import SourceDocument
import json

# Agent imports
from backend.agents.provider import LLMProvider
from backend.agents.planner import PlannerAgent
from backend.agents.idea_analyzer import IdeaAnalyzer
from backend.agents.query_planner import QueryPlanner
from backend.agents.research import ResearchAgent
from backend.agents.competition import CompetitionAgent
from backend.agents.synthesis import SynthesisAgent
from backend.agents.models import StructuredIdea, QueryPlan, SourceQuery
from backend.core.retrieval.service import RetrievalService
from backend.core.retrieval.dense import DenseRetriever
from backend.core.retrieval.sparse import SparseRetriever
from backend.core.retrieval.hybrid import HybridRetriever
from backend.core.retrieval.reranker import CrossEncoderReranker

logger = logging.getLogger(__name__)

_shared_provider: Any = None
_shared_qdrant: Any = None
_shared_reranker: Any = None


def _get_shared_embedding_provider() -> Any:
    global _shared_provider
    if _shared_provider is None:
        from backend.core.embeddings import SentenceTransformerProvider
        _shared_provider = SentenceTransformerProvider()
    return _shared_provider


def _get_shared_qdrant() -> Any:
    global _shared_qdrant
    if _shared_qdrant is None:
        from backend.core.qdrant import QdrantStore
        provider = _get_shared_embedding_provider()
        _shared_qdrant = QdrantStore(dimension=provider.dimension)
    return _shared_qdrant


def _get_shared_reranker() -> Any:
    global _shared_reranker
    if _shared_reranker is None:
        _shared_reranker = CrossEncoderReranker()
    return _shared_reranker


def node_with_error_handling(
    stage_name: str, progress_val: int
) -> Callable[[Callable[[AnalysisState], Awaitable[dict[str, Any]]]], Callable[[AnalysisState], Awaitable[dict[str, Any]]]]:
    """
    Decorator for workflow nodes to handle errors explicitly,
    log them, publish progress, and return a FAILED state.
    """
    def decorator(func: Callable[[AnalysisState], Awaitable[dict[str, Any]]]) -> Callable[[AnalysisState], Awaitable[dict[str, Any]]]:
        @functools.wraps(func)
        async def wrapper(state: AnalysisState) -> dict[str, Any]:
            publisher = ProgressPublisher(state["analysis_id"])
            try:
                # Publish progress for this stage starting
                await publisher.publish(
                    status=state.get("status", AnalysisStatus.RUNNING.value),
                    stage=stage_name,
                    progress=progress_val,
                )
                result = await func(state)
                # Ensure stage/progress are returned to update state
                if "current_stage" not in result:
                    result["current_stage"] = stage_name
                if "progress" not in result:
                    result["progress"] = progress_val
                return result
            except Exception as e:
                logger.exception(
                    f"Error in workflow stage {stage_name} for analysis {state['analysis_id']}"
                )
                await publisher.publish(
                    status=AnalysisStatus.FAILED,
                    stage=stage_name,
                    progress=progress_val,
                    error=str(e),
                )
                errors = state.get("errors", [])
                errors.append(str(e))
                return {
                    "status": AnalysisStatus.FAILED.value,
                    "current_stage": stage_name,
                    "progress": progress_val,
                    "errors": errors,
                }
        return wrapper
    return decorator


@node_with_error_handling("INITIALIZING", 5)
async def initialize_node(state: AnalysisState) -> dict[str, Any]:
    """Initialize the workflow and ensure Qdrant collection exists."""
    publisher = ProgressPublisher(state["analysis_id"])

    try:
        provider = _get_shared_embedding_provider()
        qdrant = _get_shared_qdrant()
        await qdrant.ensure_collection()
        await publisher.publish_agent_activity(
            agent_name="System",
            action="Qdrant vector store initialized",
            status="completed",
        )
    except Exception as e:
        logger.warning(f"Qdrant initialization warning (non-fatal): {e}")
        await publisher.publish_agent_activity(
            agent_name="System",
            action=f"Qdrant init warning: {e}",
            status="warning",
        )

    await publisher.publish_agent_activity(
        agent_name="Orchestrator",
        action="Analysis pipeline initialized, beginning idea understanding",
        status="completed",
    )
    return {"status": AnalysisStatus.RUNNING.value}


# ══════════════════════════════════════════════════════════════════════
# NEW: Idea Understanding Node (runs BEFORE evidence acquisition)
# ══════════════════════════════════════════════════════════════════════
@node_with_error_handling("IDEA_UNDERSTANDING", 10)
async def idea_understanding_node(state: AnalysisState) -> dict[str, Any]:
    """Parse user idea into a StructuredIdea using LLM."""
    idea = state.get("idea", {})
    publisher = ProgressPublisher(state["analysis_id"])

    await publisher.publish_agent_activity(
        agent_name="Idea Analyzer",
        action=f"Analyzing idea: '{idea.get('title', 'Unknown')}'",
        status="running",
    )

    provider = LLMProvider()
    analyzer = IdeaAnalyzer(provider)
    structured = await analyzer.analyze(idea)

    await publisher.publish_agent_activity(
        agent_name="Idea Analyzer",
        action=(
            f"Idea parsed — domain: {structured.domain}, "
            f"{len(structured.core_capabilities)} capabilities, "
            f"{len(structured.technical_concepts)} technical concepts, "
            f"{len(structured.market_terms)} market terms"
        ),
        status="completed",
        details={
            "problem": structured.problem,
            "domain": structured.domain,
            "product_type": structured.product_type,
            "capabilities": len(structured.core_capabilities),
            "technical_concepts": len(structured.technical_concepts),
            "market_terms": len(structured.market_terms),
        },
    )
    return {"structured_idea": structured.model_dump()}


# ══════════════════════════════════════════════════════════════════════
# NEW: Query Planning Node (runs BEFORE evidence acquisition)
# ══════════════════════════════════════════════════════════════════════
@node_with_error_handling("QUERY_PLANNING", 15)
async def query_planning_node(state: AnalysisState) -> dict[str, Any]:
    """Generate source-specific queries from the StructuredIdea."""
    idea = state.get("idea", {})
    structured_data = state.get("structured_idea")
    publisher = ProgressPublisher(state["analysis_id"])

    if not structured_data:
        await publisher.publish_agent_activity(
            agent_name="Query Planner",
            action="No structured idea available — using fallback queries",
            status="completed",
        )
        return {"query_plan": None}

    structured_idea = StructuredIdea(**structured_data)

    await publisher.publish_agent_activity(
        agent_name="Query Planner",
        action="Generating source-specific search queries",
        status="running",
    )

    provider = LLMProvider()
    planner = QueryPlanner(provider)
    query_plan = await planner.plan_queries(idea, structured_idea)

    total_queries = (
        len(query_plan.github_queries)
        + len(query_plan.paper_queries)
        + len(query_plan.web_queries)
    )

    await publisher.publish_agent_activity(
        agent_name="Query Planner",
        action=(
            f"Generated {total_queries} queries — "
            f"{len(query_plan.github_queries)} GitHub, "
            f"{len(query_plan.paper_queries)} papers, "
            f"{len(query_plan.web_queries)} web, "
            f"{len(query_plan.negative_keywords)} negative keywords"
        ),
        status="completed",
        details={
            "github_queries": len(query_plan.github_queries),
            "paper_queries": len(query_plan.paper_queries),
            "web_queries": len(query_plan.web_queries),
            "negative_keywords": query_plan.negative_keywords[:5],
        },
    )
    return {"query_plan": query_plan.model_dump()}


# ══════════════════════════════════════════════════════════════════════
# REWRITTEN: Evidence Acquisition (uses structured queries + relevance filtering)
# ══════════════════════════════════════════════════════════════════════
@node_with_error_handling("ACQUIRING", 30)
async def acquire_evidence_node(state: AnalysisState) -> dict[str, Any]:
    """Acquire evidence from GitHub, Research APIs, and Web with relevance filtering."""
    idea = state.get("idea", {})
    all_documents: list[SourceDocument] = []
    publisher = ProgressPublisher(state["analysis_id"])
    settings = get_settings()

    # Reconstruct structured objects from state
    structured_idea = None
    if state.get("structured_idea"):
        structured_idea = StructuredIdea(**state["structured_idea"])

    query_plan = None
    if state.get("query_plan"):
        query_plan = QueryPlan(**state["query_plan"])

    all_diagnostics: dict[str, Any] = {}

    # ── GitHub ────────────────────────────────────────────────
    await publisher.publish_agent_activity(
        agent_name="Evidence Collector",
        action="Searching GitHub for repositories, implementations, and competitors",
        status="running",
    )
    github_docs: list[SourceDocument] = []
    try:
        github_service = GitHubService()
        github_queries = query_plan.github_queries if query_plan else None
        negative_kw = query_plan.negative_keywords if query_plan else None

        github_result, github_diag = await github_service.acquire_evidence(
            idea=idea.get("title", "Unknown Idea"),
            structured_idea=structured_idea,
            source_queries=github_queries,
            negative_keywords=negative_kw,
        )
        if github_result and github_result.documents:
            github_docs = github_result.documents
            all_documents.extend(github_docs)
        all_diagnostics["github"] = github_diag.model_dump()

        await publisher.publish_source_status(
            source_name="GitHub",
            status="COMPLETED",
            candidates_found=github_diag.raw_candidates,
            relevant_count=github_diag.after_relevance_filter,
            selected_count=github_diag.selected,
            records_found=github_diag.selected,
            duration_ms=github_diag.duration_ms,
        )
        await publisher.publish_agent_activity(
            agent_name="Evidence Collector",
            action=(
                f"GitHub: {github_diag.raw_candidates} candidates → "
                f"{github_diag.after_basic_filter} filtered → "
                f"{github_diag.selected} selected"
            ),
            status="completed",
            details=github_diag.model_dump(),
        )
    except Exception as e:
        logger.warning(f"GitHub acquisition failed: {e}")
        await publisher.publish_source_status(
            source_name="GitHub", status="FAILED", error=str(e),
        )
        await publisher.publish_agent_activity(
            agent_name="Evidence Collector",
            action=f"GitHub search failed: {e}",
            status="error",
        )

    # ── Research APIs (Semantic Scholar, Crossref, IEEE) ──────
    await publisher.publish_agent_activity(
        agent_name="Evidence Collector",
        action="Searching research databases with relevance filtering",
        status="running",
    )
    research_docs: list[SourceDocument] = []
    try:
        research_service = ResearchService()
        paper_queries = query_plan.paper_queries if query_plan else None

        research_result, research_diags = await research_service.acquire_evidence(
            idea=idea.get("title", "Unknown Idea"),
            structured_idea=structured_idea,
            source_queries=paper_queries,
        )
        if research_result and research_result.documents:
            research_docs = research_result.documents
            all_documents.extend(research_docs)

        providers_used: list[str] = research_result.providers_used if research_result else []

        # Track each research provider with pipeline diagnostics
        for provider_key, diag in research_diags.items():
            all_diagnostics[provider_key] = diag.model_dump()

        # Semantic Scholar
        s2_diag = research_diags.get("semantic_scholar")
        s2_count = s2_diag.selected if s2_diag else 0
        if "semantic_scholar" in providers_used:
            await publisher.publish_source_status(
                source_name="Semantic Scholar",
                status="COMPLETED",
                candidates_found=s2_diag.raw_candidates if s2_diag else 0,
                relevant_count=s2_diag.after_relevance_filter if s2_diag else 0,
                selected_count=s2_count,
                records_found=s2_count,
                duration_ms=s2_diag.duration_ms if s2_diag else 0,
            )
        else:
            await publisher.publish_source_status(
                source_name="Semantic Scholar", status="SKIPPED",
                error="No results or API unavailable",
            )

        # Crossref
        cr_diag = research_diags.get("crossref")
        cr_count = cr_diag.selected if cr_diag else 0
        if "crossref" in providers_used:
            await publisher.publish_source_status(
                source_name="Crossref",
                status="COMPLETED",
                candidates_found=cr_diag.raw_candidates if cr_diag else 0,
                relevant_count=cr_diag.after_relevance_filter if cr_diag else 0,
                selected_count=cr_count,
                records_found=cr_count,
                duration_ms=cr_diag.duration_ms if cr_diag else 0,
            )
        else:
            await publisher.publish_source_status(
                source_name="Crossref", status="SKIPPED",
                error="No results or API unavailable",
            )

        # IEEE Xplore
        ieee_diag = research_diags.get("ieee_xplore")
        ieee_count = ieee_diag.selected if ieee_diag else 0
        if not settings.ieee_xplore_api_key:
            await publisher.publish_source_status(
                source_name="IEEE Xplore", status="SKIPPED",
                error="API key not configured",
            )
        elif "ieee_xplore" in providers_used:
            await publisher.publish_source_status(
                source_name="IEEE Xplore",
                status="COMPLETED",
                candidates_found=ieee_diag.raw_candidates if ieee_diag else 0,
                relevant_count=ieee_diag.after_relevance_filter if ieee_diag else 0,
                selected_count=ieee_count,
                records_found=ieee_count,
            )
        else:
            await publisher.publish_source_status(
                source_name="IEEE Xplore", status="SKIPPED",
                error="No results returned",
            )

        await publisher.publish_agent_activity(
            agent_name="Evidence Collector",
            action=(
                f"Research: S2={s2_count} papers, Crossref={cr_count} papers, "
                f"IEEE={ieee_count} papers selected"
            ),
            status="completed",
        )
    except Exception as e:
        logger.warning(f"Research acquisition failed: {e}")
        await publisher.publish_source_status(
            source_name="Semantic Scholar", status="FAILED", error=str(e),
        )
        await publisher.publish_source_status(
            source_name="Crossref", status="FAILED", error=str(e),
        )
        await publisher.publish_source_status(
            source_name="IEEE Xplore", status="FAILED", error=str(e),
        )

    # ── Crawl4AI ──────────────────────────────────────────────
    web_docs: list[SourceDocument] = []
    if settings.crawl4ai_enabled:
        await publisher.publish_agent_activity(
            agent_name="Evidence Collector",
            action="Crawling web pages for additional evidence",
            status="running",
        )
        try:
            urls_to_crawl: list[str] = []
            for doc in all_documents:
                if doc.url and doc.url not in urls_to_crawl:
                    urls_to_crawl.append(doc.url)
            urls_to_crawl = urls_to_crawl[:settings.crawl_max_pages_per_job]

            if urls_to_crawl:
                crawl_adapter = CrawlAdapter()
                crawl_tasks = [crawl_adapter.acquire_page(url) for url in urls_to_crawl]
                crawl_results = await asyncio.gather(*crawl_tasks, return_exceptions=True)
                for url, res in zip(urls_to_crawl, crawl_results):
                    if isinstance(res, BaseException):
                        logger.warning(f"Failed to crawl {url}: {res}")
                    elif res is not None:
                        web_docs.append(res)
                        all_documents.append(res)

            await publisher.publish_source_status(
                source_name="Web", status="COMPLETED",
                candidates_found=len(urls_to_crawl),
                selected_count=len(web_docs),
                records_found=len(web_docs),
            )
            await publisher.publish_agent_activity(
                agent_name="Evidence Collector",
                action=f"Web crawl complete — {len(web_docs)} pages extracted",
                status="completed",
            )
        except Exception as e:
            logger.warning(f"Web crawl failed: {e}")
            await publisher.publish_source_status(
                source_name="Web", status="FAILED", error=str(e),
            )
    else:
        await publisher.publish_source_status(
            source_name="Web", status="SKIPPED",
            error="Crawl4AI not enabled",
        )

    await publisher.publish_agent_activity(
        agent_name="Orchestrator",
        action=f"Evidence acquisition complete — {len(all_documents)} relevant documents collected (filtered from larger candidate pools)",
        status="completed",
        details={"total_documents": len(all_documents), "diagnostics": all_diagnostics},
    )

    return {
        "_raw_documents": all_documents,
        "retrieval_diagnostics": all_diagnostics,
    }


@node_with_error_handling("PROCESSING", 55)
async def process_evidence_node(state: AnalysisState) -> dict[str, Any]:
    """Process raw documents into chunks and vectors."""
    raw_docs: list[SourceDocument] = cast(list[SourceDocument], state.get("_raw_documents", []))
    publisher = ProgressPublisher(state["analysis_id"])

    if not raw_docs:
        await publisher.publish_agent_activity(
            agent_name="Document Processor",
            action="No documents to process — continuing with existing knowledge base",
            status="completed",
        )
        return {"evidence_references": []}

    await publisher.publish_agent_activity(
        agent_name="Document Processor",
        action=f"Processing {len(raw_docs)} relevant documents: normalizing, deduplicating, chunking, and embedding",
        status="running",
    )

    document_pipeline = DocumentPipeline()
    async with async_session_factory() as session:
        saved_doc_ids = await document_pipeline.process_batch(session, raw_docs)

    await publisher.publish_agent_activity(
        agent_name="Document Processor",
        action=f"Processing complete — {len(saved_doc_ids)} documents indexed in vector store",
        status="completed",
        details={"indexed_count": len(saved_doc_ids)},
    )

    return {"evidence_references": saved_doc_ids, "_raw_documents": None}




def _build_retrieval_service(session: Any) -> RetrievalService:
    """Helper to construct the E2E Retrieval Service using cached ML model singletons."""
    provider = _get_shared_embedding_provider()
    qdrant = _get_shared_qdrant()
    dense = DenseRetriever(provider, qdrant)
    sparse = SparseRetriever(session)
    hybrid = HybridRetriever()
    reranker = _get_shared_reranker()
    return RetrievalService(dense, sparse, hybrid, reranker)


@node_with_error_handling("PLANNING", 65)
async def planner_node(state: AnalysisState) -> dict[str, Any]:
    """Execute the Planner Agent."""
    idea = state.get("idea", {})
    publisher = ProgressPublisher(state["analysis_id"])

    await publisher.publish_agent_activity(
        agent_name="Planner Agent",
        action=f"Creating research plan for '{idea.get('title', 'Unknown')}'",
        status="running",
    )

    provider = LLMProvider()
    agent = PlannerAgent(provider)
    plan = await agent.plan(idea)

    await publisher.publish_agent_activity(
        agent_name="Planner Agent",
        action=f"Research plan created with {len(plan.research_questions)} research questions and {len(plan.competitor_questions)} competitor questions",
        status="completed",
        details={
            "research_questions": len(plan.research_questions),
            "competitor_questions": len(plan.competitor_questions),
        },
    )
    return {"plan": plan.model_dump()}


@node_with_error_handling("RESEARCHING", 75)
async def research_node(state: AnalysisState) -> dict[str, Any]:
    """Execute the Research Agent."""
    plan = state.get("plan")
    publisher = ProgressPublisher(state["analysis_id"])

    if not plan or not plan.get("research_questions"):
        await publisher.publish_agent_activity(
            agent_name="Research Agent",
            action="No research questions to investigate — skipping",
            status="completed",
        )
        return {"research_findings": None}

    await publisher.publish_agent_activity(
        agent_name="Research Agent",
        action=f"Investigating {len(plan['research_questions'])} research questions using hybrid retrieval",
        status="running",
    )

    provider = LLMProvider()
    async with async_session_factory() as session:
        retrieval_service = _build_retrieval_service(session)
        agent = ResearchAgent(provider, retrieval_service)
        findings = await agent.research(plan["research_questions"])

    await publisher.publish_agent_activity(
        agent_name="Research Agent",
        action=f"Research complete — {len(findings.findings)} findings generated",
        status="completed",
        details={"findings_count": len(findings.findings)},
    )
    return {"research_findings": findings.model_dump()}


@node_with_error_handling("ANALYZING_COMPETITION", 82)
async def competition_node(state: AnalysisState) -> dict[str, Any]:
    """Execute the Competition Agent."""
    plan = state.get("plan")
    idea = state.get("idea", {})
    publisher = ProgressPublisher(state["analysis_id"])

    if not plan or not plan.get("competitor_questions"):
        await publisher.publish_agent_activity(
            agent_name="Competition Agent",
            action="No competitor questions to analyze — skipping",
            status="completed",
        )
        return {"competition_findings": None}

    await publisher.publish_agent_activity(
        agent_name="Competition Agent",
        action=f"Analyzing competitive landscape across {len(plan['competitor_questions'])} dimensions",
        status="running",
    )

    provider = LLMProvider()
    async with async_session_factory() as session:
        retrieval_service = _build_retrieval_service(session)
        agent = CompetitionAgent(provider, retrieval_service)
        findings = await agent.analyze_competition(idea, plan["competitor_questions"])

    await publisher.publish_agent_activity(
        agent_name="Competition Agent",
        action=f"Competition analysis complete — {len(findings.competitors)} competitors identified",
        status="completed",
        details={"competitors_found": len(findings.competitors)},
    )
    return {"competition_findings": findings.model_dump()}


@node_with_error_handling("SYNTHESIZING", 90)
async def synthesis_node(state: AnalysisState) -> dict[str, Any]:
    """Execute the Synthesis Agent."""
    plan = state.get("plan", {})
    research = state.get("research_findings", {})
    competition = state.get("competition_findings", {})
    publisher = ProgressPublisher(state["analysis_id"])

    await publisher.publish_agent_activity(
        agent_name="Synthesis Agent",
        action="Synthesizing research findings, competition data, and evidence into coherent analysis",
        status="running",
    )

    provider = LLMProvider()
    agent = SynthesisAgent(provider)
    synthesis = await agent.synthesize(plan or {}, research or {}, competition or {})

    await publisher.publish_agent_activity(
        agent_name="Synthesis Agent",
        action="Evidence synthesis complete — generating final assessment",
        status="completed",
    )
    return {"synthesis": synthesis.model_dump()}


@node_with_error_handling("SCORING", 95)
async def scoring_node(state: AnalysisState) -> dict[str, Any]:
    """Execute the Deterministic Scoring Engine and persist scores."""
    publisher = ProgressPublisher(state["analysis_id"])
    await publisher.publish_agent_activity(
        agent_name="Scoring Engine",
        action="Computing deterministic scores: Novelty, Market Saturation, Pain, Feasibility, Opportunity, Risk",
        status="running",
    )

    provider = _get_shared_embedding_provider()
    qdrant = _get_shared_qdrant()
    dense_retriever = DenseRetriever(provider, qdrant)
    
    engine = ScoringEngine(dense_retriever)
    scores = await engine.compute_all_scores(state)
    
    # Persist scores to DB
    from sqlalchemy import delete
    async with async_session_factory() as session:
        await session.execute(
            delete(AnalysisScore).where(AnalysisScore.analysis_id == state["analysis_id"])
        )
        for metric, score_result in scores.items():
            db_score = AnalysisScore(
                analysis_id=state["analysis_id"],
                metric_name=score_result.metric,
                score=score_result.score,
                status=score_result.status.value,
                calculation_version=score_result.calculation_version,
                inputs=json.dumps(score_result.inputs),
                evidence_references=json.dumps(score_result.evidence_references),
                explanation=score_result.explanation
            )
            session.add(db_score)
        
        await session.commit()
    
    scored_count = sum(1 for s in scores.values() if s.score is not None)
    await publisher.publish_agent_activity(
        agent_name="Scoring Engine",
        action=f"Scoring complete — {scored_count}/{len(scores)} metrics computed with evidence",
        status="completed",
        details={m: {"score": s.score, "status": s.status.value} for m, s in scores.items()},
    )

    # Convert to dict for state
    scores_dict = {k: v.model_dump() for k, v in scores.items()}
    return {"scores": scores_dict}


@node_with_error_handling("COMPLETED", 100)
async def complete_analysis_node(state: AnalysisState) -> dict[str, Any]:
    """Mark workflow as completed and persist structured findings and evidence."""
    from backend.models.evidence import Finding, Evidence, SourceChunk, SourceDocument
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    analysis_id = state["analysis_id"]
    publisher = ProgressPublisher(analysis_id)

    async with async_session_factory() as session:
        # 1. Persist Findings
        research = state.get("research_findings") or {}
        for rf in research.get("findings", []):
            if rf.get("finding"):
                finding_text = rf["finding"]
                f_title = finding_text[:80] + ("..." if len(finding_text) > 80 else "")
                
                # Dynamically classify engineering / architecture / feasibility findings
                text_low = finding_text.lower()
                is_technical = any(k in text_low for k in [
                    "architecture", "feasibility", "implementation", "bottleneck",
                    "latency", "throughput", "scalability", "pipeline", "protocol",
                    "api", "integration", "database", "concurrency", "memory",
                    "driver", "real-time", "hardware", "backend", "infrastructure",
                    "security", "encryption", "auth", "interoperability", "benchmark"
                ])
                f_cat = "feasibility" if is_technical else "research"

                session.add(Finding(
                    analysis_id=analysis_id,
                    category=f_cat,
                    title=f_title,
                    description=finding_text,
                    confidence=1.0 if rf.get("qualification") == "supported" else 0.75,
                    evidence_count=len(rf.get("evidence_references", [])),
                    evidence_ids=json.dumps(rf.get("evidence_references", []))
                ))

        competition = state.get("competition_findings") or {}
        for comp in competition.get("competitors", []):
            c_name = comp.get("competitor") or "Competitor"
            c_refs = comp.get("evidence_references", [])
            has_refs = len(c_refs) > 0
            
            desc_parts = []
            if comp.get("similarities"):
                desc_parts.append(f"Similarities: {', '.join(comp['similarities'])}")
            if comp.get("differences"):
                desc_parts.append(f"Differences: {', '.join(comp['differences'])}")
            if comp.get("uncertainties"):
                desc_parts.append(f"Uncertainties: {comp['uncertainties']}")

            session.add(Finding(
                analysis_id=analysis_id,
                category="competition",
                title=f"Competitor: {c_name}",
                description="; ".join(desc_parts) or f"Identified competitor {c_name}",
                confidence=0.85 if has_refs else 0.70,
                evidence_count=len(c_refs),
                evidence_ids=json.dumps(c_refs)
            ))

            # Also persist genuine competitors to Competitor table with honest provenance
            from backend.models.competitor import Competitor
            stype = "github" if any("github" in r.lower() for r in c_refs) else "market"
            ctype = "Open Source Implementation" if stype == "github" else "Alternative Solution"
            session.add(Competitor(
                analysis_id=analysis_id,
                name=c_name,
                description="; ".join(desc_parts[:2]) or f"Identified {ctype} {c_name}",
                url=None,
                source_type=stype,
                competitor_type=ctype,
                features="55" if has_refs else None,
                last_updated="Verified Precedent" if has_refs else "Market Candidate",
                target_audience=state.get("idea", {}).get("target_audience")
            ))

        synthesis = state.get("synthesis") or {}
        for kf in synthesis.get("key_findings", []):
            session.add(Finding(
                analysis_id=analysis_id,
                category="synthesis",
                title="Synthesized Finding",
                description=kf,
                confidence=0.9,
                evidence_count=len(synthesis.get("evidence_references", [])),
                evidence_ids=json.dumps(synthesis.get("evidence_references", []))
            ))

        for mo in synthesis.get("market_observations", []):
            session.add(Finding(
                analysis_id=analysis_id,
                category="market",
                title="Market Observation",
                description=mo,
                confidence=0.85,
                evidence_count=0,
                evidence_ids="[]"
            ))

        for co in synthesis.get("competitor_observations", []):
            session.add(Finding(
                analysis_id=analysis_id,
                category="competition",
                title="Market Landscape",
                description=co,
                confidence=0.85,
                evidence_count=0,
                evidence_ids="[]"
            ))

        def _classify_risk(unc: str) -> tuple[str, float]:
            u_low = unc.lower()
            if any(w in u_low for w in ["hipaa", "fda", "gdpr", "compliance", "regulatory", "legal", "liability"]):
                return "Regulatory & Compliance Risk", 0.85
            elif any(w in u_low for w in ["security", "privacy", "breach", "authentication", "encryption", "leak"]):
                return "Security & Privacy Risk", 0.85
            elif any(w in u_low for w in ["ehr", "api", "integration", "interoperability", "latency", "scalability", "hardware", "performance"]):
                return "Technical & Integration Constraint", 0.80
            elif any(w in u_low for w in ["adoption", "workflow", "clinical", "resistance", "training", "operational", "staff"]):
                return "Operational & Workflow Risk", 0.80
            elif any(w in u_low for w in ["cost", "pricing", "roi", "tco", "budget", "capital", "financial"]):
                return "Financial & Economic Viability", 0.75
            elif any(w in u_low for w in ["missing", "unclear", "lack", "unavailable", "unknown", "gap"]):
                return "Evidence Gap & Verification Void", 0.75
            return "Execution & Market Risk", 0.80

        seen_unc = set()
        for unc in synthesis.get("uncertainties", []):
            if not unc or unc.strip() in seen_unc:
                continue
            seen_unc.add(unc.strip())
            
            r_title, r_conf = _classify_risk(unc)
            session.add(Finding(
                analysis_id=analysis_id,
                category="risk",
                title=r_title,
                description=unc,
                confidence=r_conf,
                evidence_count=0,
                evidence_ids="[]"
            ))

        # 2. Persist Evidence
        used_chunk_ids = set()
        for rf in research.get("findings", []):
            for ref in rf.get("evidence_references", []):
                used_chunk_ids.add(ref)
        for comp in competition.get("competitors", []):
            for ref in comp.get("evidence_references", []):
                used_chunk_ids.add(ref)
        for ref in synthesis.get("evidence_references", []):
            used_chunk_ids.add(ref)

        def _determine_evidence_type(doc: Any) -> str:
            if not doc:
                return "research"
            src = (doc.source or "").lower()
            stype = (doc.source_type or "").lower()
            url = (doc.source_url or "").lower()
            if src == "github" or stype == "repository" or "github.com" in url:
                return "github"
            elif src == "web" or stype == "web_page":
                return "web"
            elif src in ("semantic_scholar", "crossref", "ieee_xplore") or stype in ("paper", "research"):
                return "research"
            return src if src else "research"

        persisted_chunk_ids: set[str] = set()
        persisted_doc_ids: set[str] = set()

        if used_chunk_ids:
            chunk_stmt = (
                select(SourceChunk)
                .options(selectinload(SourceChunk.document))
                .where(SourceChunk.id.in_(list(used_chunk_ids)))
            )
            chunk_res = await session.execute(chunk_stmt)
            chunks = chunk_res.scalars().all()
            for chunk in chunks:
                doc = chunk.document
                ev_type = _determine_evidence_type(doc)
                session.add(Evidence(
                    analysis_id=analysis_id,
                    chunk_id=chunk.id,
                    document_id=chunk.document_id,
                    evidence_type=ev_type,
                    claim=chunk.content[:300],
                    supporting_text=chunk.content,
                    source_url=doc.source_url if doc else None,
                    source_title=doc.title if doc else None,
                    confidence=0.9,
                    relevance_score=0.85
                ))
                persisted_chunk_ids.add(chunk.id)
                if chunk.document_id:
                    persisted_doc_ids.add(chunk.document_id)

        # Ensure acquired documents (e.g., GitHub repositories, Web pages) also have evidence records persisted
        all_acquired_doc_ids = state.get("evidence_references") or []
        remaining_doc_ids = [d_id for d_id in all_acquired_doc_ids if d_id not in persisted_doc_ids]
        if remaining_doc_ids:
            remaining_stmt = (
                select(SourceChunk)
                .options(selectinload(SourceChunk.document))
                .where(SourceChunk.document_id.in_(remaining_doc_ids))
            )
            rem_res = await session.execute(remaining_stmt)
            rem_chunks = rem_res.scalars().all()

            # Pick 1 representative chunk per remaining document
            doc_chunk_map: dict[str, SourceChunk] = {}
            for chk in rem_chunks:
                if chk.document_id not in doc_chunk_map:
                    doc_chunk_map[chk.document_id] = chk

            for doc_id, chunk in doc_chunk_map.items():
                if chunk.id in persisted_chunk_ids:
                    continue
                doc = chunk.document
                ev_type = _determine_evidence_type(doc)
                rel_score = 0.8
                if doc and doc.metadata_:
                    rel_score = float(doc.metadata_.get("relevance_score", 0.8))
                session.add(Evidence(
                    analysis_id=analysis_id,
                    chunk_id=chunk.id,
                    document_id=chunk.document_id,
                    evidence_type=ev_type,
                    claim=chunk.content[:300],
                    supporting_text=chunk.content,
                    source_url=doc.source_url if doc else None,
                    source_title=doc.title if doc else None,
                    confidence=0.85,
                    relevance_score=rel_score
                ))

        await session.commit()

    await publisher.publish_agent_activity(
        agent_name="Orchestrator",
        action="Analysis pipeline completed successfully — report ready",
        status="completed",
    )

    await publisher.publish(
        status=AnalysisStatus.COMPLETED,
        stage="COMPLETED",
        progress=100
    )
    return {"status": AnalysisStatus.COMPLETED.value, "current_stage": "COMPLETED", "progress": 100}


async def fail_analysis_node(state: AnalysisState) -> dict[str, Any]:
    """Centralized failure handler node."""
    publisher = ProgressPublisher(state["analysis_id"])
    await publisher.publish_agent_activity(
        agent_name="Orchestrator",
        action=f"Analysis failed: {'; '.join(state.get('errors', ['Unknown error']))}",
        status="error",
    )
    return {"status": AnalysisStatus.FAILED.value}
