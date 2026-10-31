"""
DIME Backend — Idea Extraction & AI Builder Endpoints (v1).

Exposes API endpoints for:
- Natural-language idea extraction & structuring
- AI idea description improvement
- Interactive AI Idea Builder chat
- Idea summary generation from builder dialog
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Depends, status

from backend.schemas.idea_submission import (
    NaturalLanguageIdeaRequest,
    ExtractedIdeaResponse,
    ImproveIdeaRequest,
    ImproveIdeaResponse,
    BuilderChatRequest,
    BuilderChatResponse,
    BuilderSummaryRequest,
)
from backend.services.idea_extractor import IdeaExtractionService

logger = logging.getLogger(__name__)

router = APIRouter()

# Singleton or factory for service
def get_idea_extraction_service() -> IdeaExtractionService:
    return IdeaExtractionService()


@router.post(
    "/extract",
    response_model=ExtractedIdeaResponse,
    summary="Extract structured idea fields from natural language",
)
async def extract_idea_from_text(
    payload: NaturalLanguageIdeaRequest,
    service: IdeaExtractionService = Depends(get_idea_extraction_service),
) -> ExtractedIdeaResponse:
    """
    Parses a user's natural language description into structured fields:
    title, problem, proposed solution, target audience, industry, features,
    assumptions, and field attribution (user-provided vs inferred vs unknown).
    """
    try:
        if len(payload.raw_description.strip()) < 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Idea description is too short. Please provide at least 15 characters.",
            )

        extracted = await service.extract_from_natural_language(payload)
        return extracted
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("idea_extraction_fallback_triggered: %s. Using heuristic extraction.", exc)
        return service._heuristic_extract(payload)


@router.post(
    "/improve",
    response_model=ImproveIdeaResponse,
    summary="Refine and clarify a raw idea description",
)
async def improve_idea(
    payload: ImproveIdeaRequest,
    service: IdeaExtractionService = Depends(get_idea_extraction_service),
) -> ImproveIdeaResponse:
    """
    Clarifies and organizes an informal idea into Problem, Solution,
    and Target Audience without inventing unsupported business claims.
    """
    try:
        if len(payload.raw_description.strip()) < 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide a bit more detail before requesting an improvement.",
            )

        improved = await service.improve_idea_description(payload)
        return improved
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("idea_improvement_failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to improve idea description: {str(exc)}",
        )


@router.post(
    "/builder-chat",
    response_model=BuilderChatResponse,
    summary="Conversational turns for the AI Idea Builder",
)
async def builder_chat(
    payload: BuilderChatRequest,
    service: IdeaExtractionService = Depends(get_idea_extraction_service),
) -> BuilderChatResponse:
    """
    Assists founders in clarifying their concept step by step,
    answering questions, and identifying problem, users, and solution.
    """
    try:
        if not payload.messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversation history cannot be empty.",
            )

        reply = await service.chat_builder(payload)
        return reply
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("builder_chat_failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Conversational builder failed: {str(exc)}",
        )


@router.post(
    "/builder-summary",
    response_model=ExtractedIdeaResponse,
    summary="Synthesize builder conversation into structured idea",
)
async def builder_summary(
    payload: BuilderSummaryRequest,
    service: IdeaExtractionService = Depends(get_idea_extraction_service),
) -> ExtractedIdeaResponse:
    """
    Synthesizes the complete dialog into a structured idea representation
    ready for review and validation dispatch.
    """
    try:
        if not payload.messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No conversation history to summarize.",
            )

        summary = await service.summarize_builder_conversation(payload)
        return summary
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("builder_summary_failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to summarize conversation: {str(exc)}",
        )
