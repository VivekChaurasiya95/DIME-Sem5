"""
DIME Backend - Competition Agent (Phase 10).
"""

import asyncio
import logging
from backend.agents.models import CompetitionFindings, CompetitionFinding
from backend.agents.provider import LLMProvider
from backend.agents.prompts import COMPETITION_PROMPT
from backend.core.retrieval.service import RetrievalService
from backend.core.retrieval.models import RetrievalQuery
from typing import Any

logger = logging.getLogger(__name__)


class CompetitionAgent:
    """
    Identifies and analyzes competitors or similar existing solutions based on evidence.
    """
    def __init__(self, provider: LLMProvider, retrieval_service: RetrievalService) -> None:
        self.provider = provider
        self.settings = provider.settings
        self.retrieval_service = retrieval_service

    async def _retrieve_for_question(self, question: str) -> list:
        """Retrieves evidence for a competitive question using session-bound service."""
        query = RetrievalQuery(
            query_text=question,
            top_k=self.settings.agent_retrieval_top_k
        )
        return await self.retrieval_service.retrieve(query)

    async def _generate_for_question(self, idea: dict[str, Any], question: str, results: list) -> CompetitionFindings:
        """Formats evidence and calls the LLM with structured outputs."""
        valid_chunk_ids = {r.chunk_id for r in results}
        
        if not results:
            return CompetitionFindings(
                competitors=[],
                gaps=[f"No evidence found for competitive question: {question}"]
            )

        evidence_text = "\n".join(
            f"---\nChunk ID: {r.chunk_id}\nTitle: {r.title or 'Unknown'}\nContent: {r.text}\n---"
            for r in results if r.text
        )

        prompt = f"""
[USER IDEA]
Title: {idea.get('title', 'N/A')}
Description: {idea.get('description', 'N/A')}

[COMPETITION QUESTION]
{question}

[RETRIEVED EVIDENCE]
{evidence_text}
"""

        raw_findings = await self.provider.structured_generate(
            prompt=prompt,
            response_model=CompetitionFindings,
            system_prompt=COMPETITION_PROMPT
        )

        validated_competitors = []
        for comp in raw_findings.competitors:
            valid_refs = [ref for ref in comp.evidence_references if ref in valid_chunk_ids]
            comp.evidence_references = valid_refs
            
            # If no chunk IDs exist in indexed technical evidence, preserve candidate as market hypothesis
            if not valid_refs:
                logger.info(f"Retaining recognized commercial competitor '{comp.competitor}' as market candidate without indexed repository chunks.")
                if not comp.uncertainties:
                    comp.uncertainties = "Recognized market alternative; unverified in indexed technical evidence."
                elif "unverified" not in comp.uncertainties.lower():
                    comp.uncertainties = f"{comp.uncertainties} (Unverified in indexed technical evidence)"

            validated_competitors.append(comp)

        raw_findings.competitors = validated_competitors
        return raw_findings

    async def analyze_competition(self, idea: dict[str, Any], competitor_questions: list[str]) -> CompetitionFindings:
        """
        Processes a list of competition analysis questions.
        Retrieval is executed safely on the session, then LLM generation is parallelized.
        """
        questions_to_process = competitor_questions[:self.settings.agent_max_competitor_questions]
        if not questions_to_process:
            return CompetitionFindings(competitors=[], gaps=[])

        # 1. Sequential retrieval (prevents SQLAlchemy session concurrency conflicts)
        retrieval_pairs = []
        for q in questions_to_process:
            try:
                res = await self._retrieve_for_question(q)
                retrieval_pairs.append((q, res))
            except Exception as e:
                logger.error(f"Error retrieving for '{q}': {e}")
                retrieval_pairs.append((q, []))

        # 2. Concurrent LLM generation (massively speeds up the slowest step)
        tasks = [self._generate_for_question(idea, q, res) for q, res in retrieval_pairs]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_competitors = []
        all_gaps = []

        for (q, _), res in zip(retrieval_pairs, results):
            if isinstance(res, Exception):
                logger.error(f"Error analyzing competitive question '{q}': {res}")
                all_gaps.append(f"Failed to analyze question: {q}")
            elif isinstance(res, CompetitionFindings):
                all_competitors.extend(res.competitors)
                all_gaps.extend(res.gaps)

        # Simple deduplication by competitor name to keep findings cleaner
        seen = set()
        dedup_competitors = []
        for comp in all_competitors:
            name_lower = comp.competitor.lower().strip()
            if name_lower not in seen:
                seen.add(name_lower)
                dedup_competitors.append(comp)

        return CompetitionFindings(
            competitors=dedup_competitors,
            gaps=all_gaps
        )
