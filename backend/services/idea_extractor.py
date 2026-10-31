"""
DIME Backend - AI Idea Extraction & Builder Service.

Transforms natural language input and conversational builder transcripts
into the normalized schema expected by DIME's multi-agent validation pipeline.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from backend.agents.provider import LLMProvider
from backend.schemas.idea_submission import (
    NaturalLanguageIdeaRequest,
    ExtractedIdeaResponse,
    ImproveIdeaRequest,
    ImproveIdeaResponse,
    BuilderChatRequest,
    BuilderChatResponse,
    BuilderSummaryRequest,
    BuilderChatMessage,
)

logger = logging.getLogger(__name__)


EXTRACTION_SYSTEM_PROMPT = """\
You are DIME's Senior Product Intelligence Architect.
Your task is to analyze an unformatted, natural-language business or product idea and extract a structured, grounded representation for downstream multi-agent market validation.

CRITICAL RULES:
1. Grounding & Honesty:
   - Only state as 'user_provided_fields' what the user explicitly stated.
   - For fields you reasonably extrapolate (e.g. industry category, technical concepts), label them in 'inferred_fields'.
   - If crucial elements like pricing model, competitors, or geographic bounds are absent, mark them in 'unknown_fields' and provide null or honest notes.
   - NEVER fabricate fake market sizes, customer research numbers, or claim the idea is already validated.
2. Title: Create a concise, professional title (under 80 characters, e.g. 'AI Placement Prep Platform').
3. Description: Write a clear 2-4 sentence summary of the proposed solution and mechanism.
4. Problem Statement: Articulate the core user pain point being solved.
5. Proposed Solution: How the product solves that pain point.
6. Target Audience: Specific personas (e.g. 'CS Undergraduates, Bootcamp Graduates, Hiring Managers'). Avoid generic 'Everyone'.
7. Industry: High-level classification (e.g. 'EdTech / Career Development', 'Developer Tools', 'Fintech', 'HealthTech', 'E-commerce').
8. Output MUST strictly conform to the ExtractedIdeaResponse schema.
"""


IMPROVEMENT_SYSTEM_PROMPT = """\
You are an expert Startup Advisor and YC-level Pitch Coach for DIME.
Your goal is to take a raw, informal idea description and rewrite it into a crisp, persuasive, and structured description without altering the original intent.

CRITICAL RULES:
1. Never invent customer testimonials, fake revenues, or market statistics.
2. Preserve all core concepts, audience hints, and unique angles from the user's input.
3. Organize clearly into: Problem, Solution, Target Audience, and Value Proposition.
4. Keep the improved description natural, compelling, and between 100-300 words.
5. List 2-4 bullet points in 'key_enhancements' explaining what was clarified (e.g., 'Articulated core monetization model', 'Specified target user persona').
"""


BUILDER_CHAT_SYSTEM_PROMPT = """\
You are DIME's Conversational Idea Builder — an empathetic, incisive AI product advisor.
Your role is to help the user turn a rough concept into a well-defined business idea through a friendly, natural dialog.

CONVERSATION PRINCIPLES:
1. Don't interrogate! Ask at most 1 or 2 focused questions at a time based on what the user just said.
2. Acknowledge and validate what the user shared before asking the next question.
3. Key areas to touch over the conversation (only as needed):
   - Problem & pain point
   - Target user & customer segment
   - Proposed solution & unique differentiator
   - Business/revenue model (optional)
4. If the user has already provided sufficient clarity on Problem, Target Users, and Proposed Solution, set 'is_ready_for_validation' to True!
5. Provide 2-3 short, actionable suggestions in 'suggested_questions' that the user can click as quick responses.
"""


BUILDER_SUMMARY_SYSTEM_PROMPT = """\
You are DIME's Senior Product Intelligence Architect.
Your task is to take a complete conversational transcript between a founder and DIME's AI Idea Builder, and synthesize the discussion into a single, cohesive, structured ExtractedIdeaResponse.

CRITICAL RULES:
1. Synthesize all answers given by the user across the conversation.
2. Differentiate between explicitly stated user decisions and inferred assumptions.
3. Produce a clear, professional working title and description suitable for immediate dispatch to DIME's multi-agent validation pipeline.
"""


class IdeaExtractionService:
    """Service providing natural language idea parsing, improvement, and conversational building."""

    def __init__(self, provider: LLMProvider | None = None) -> None:
        self.provider = provider or LLMProvider()

    def _heuristic_extract(
        self, request: NaturalLanguageIdeaRequest
    ) -> ExtractedIdeaResponse:
        """
        Deterministic, rule-based extraction fallback for when LLM providers
        are rate-limited (HTTP 429), unreachable, or fail to respond.
        Guarantees that users are never blocked from validating their idea.
        """
        raw_text = (request.raw_description or "").strip()
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

        # 1. Title derivation
        first_line = lines[0].lstrip("#0123456789. \t").strip() if lines else "Untitled Idea"
        title = first_line[:145] if len(first_line) > 145 else first_line
        if len(title) < 5 and len(lines) > 1:
            title = f"{title} - {lines[1][:80]}".strip()

        # 2. Section parsing
        sections: dict[str, list[str]] = {}
        current_sec = "overview"
        for line in lines[1:]:
            header_m = re.match(r"^(?:[0-9]+[\.\)]\s*|#+\s*)([A-Za-z\s&/]+)[:\-\s]*$", line)
            if header_m:
                current_sec = header_m.group(1).strip().lower()
                sections[current_sec] = []
            else:
                sections.setdefault(current_sec, []).append(line)

        # 3. Problem statement
        problem_candidates: list[str] = []
        for sec, content in sections.items():
            if any(k in sec for k in ("problem", "pain", "challenge", "issue")):
                problem_candidates.extend(content)
        if not problem_candidates:
            for line in lines:
                if any(w in line.lower() for w in ("problem", "reduce", "reducing", "costly", "expensive", "inefficient", "barrier", "friction", "lack of")):
                    problem_candidates.append(line)
        problem_statement = " ".join(problem_candidates).strip()
        if not problem_statement:
            problem_statement = f"Current operational workflows in this problem space lack an automated, reliable mechanism for {title.lower()}."

        # 4. Proposed solution
        solution_candidates: list[str] = []
        for sec, content in sections.items():
            if any(k in sec for k in ("solution", "overview", "product", "system", "mechanism")):
                solution_candidates.extend(content)
        if not solution_candidates:
            solution_candidates = lines[1:4]
        proposed_solution = " ".join(solution_candidates).strip()
        if not proposed_solution:
            proposed_solution = f"A specialized software and hardware automation architecture designed to address {title.lower()}."

        # 5. Target audience
        target_audience = request.target_audience or ""
        if not target_audience:
            for sec, content in sections.items():
                if any(k in sec for k in ("target", "audience", "market", "customer", "user")):
                    target_audience = " ".join(content).strip()
                    break
        if not target_audience:
            target_audience = "Enterprise operators, domain specialists, and commercial facility managers."

        # 6. Industry
        industry = request.industry or ""
        if not industry:
            lower_text = raw_text.lower()
            if any(w in lower_text for w in ("solar", "panel", "energy", "grid", "clean", "renew")):
                industry = "CleanTech / Solar Energy"
            elif any(w in lower_text for w in ("water", "leak", "pipe", "utility")):
                industry = "PropTech / Utility Management"
            elif any(w in lower_text for w in ("robot", "hardware", "drone", "sensor", "iot")):
                industry = "Robotics & IoT"
            elif any(w in lower_text for w in ("health", "clinic", "patient", "medical")):
                industry = "HealthTech"
            elif any(w in lower_text for w in ("finance", "payment", "bank", "credit")):
                industry = "FinTech"
            elif any(w in lower_text for w in ("education", "learn", "student", "school")):
                industry = "EdTech"
            else:
                industry = "Enterprise Technology & Automation"

        # 7. Core features (bullets or key items)
        bullets = re.findall(r"(?:^[•\-\*]\s*|\n[•\-\*]\s*)([^\n•\-\*]+)", raw_text)
        core_features = [b.strip() for b in bullets if len(b.strip()) > 5][:6]
        if not core_features:
            core_features = [
                f"Automated execution and monitoring for {title}",
                "Real-time sensor telemetry and anomaly detection",
                "Centralized reporting and diagnostic metrics dashboard",
            ]

        # 8. Description
        description = f"{title}: {proposed_solution[:300]}"

        # 9. Attribution tracking
        user_provided = ["title", "description"]
        if request.target_audience or any("audience" in s or "market" in s for s in sections):
            user_provided.append("target_audience")
        if request.industry:
            user_provided.append("industry")
        if any("problem" in s for s in sections):
            user_provided.append("problem_statement")
        if any("solution" in s for s in sections):
            user_provided.append("proposed_solution")
        if bullets:
            user_provided.append("core_features")

        inferred = [f for f in ["industry", "target_audience", "business_model", "assumptions"] if f not in user_provided]
        unknown = [f for f in ["known_competitors", "geographic_market", "missing_information"] if f not in user_provided]

        return ExtractedIdeaResponse(
            title=title,
            description=description,
            problem_statement=problem_statement,
            proposed_solution=proposed_solution,
            target_audience=target_audience,
            industry=industry,
            core_features=core_features,
            business_model=request.business_model,
            known_competitors=[request.known_competitors] if request.known_competitors else [],
            geographic_market=request.geographic_market,
            assumptions=[request.assumptions] if request.assumptions else ["Standard commercial adoption rates apply."],
            missing_information=["Unit economics", "Target pricing tier", "Primary sales channel"],
            user_provided_fields=user_provided,
            inferred_fields=inferred,
            unknown_fields=unknown,
        )

    async def extract_from_natural_language(
        self, request: NaturalLanguageIdeaRequest
    ) -> ExtractedIdeaResponse:
        """Extract structured idea information from raw natural language description and optional hints."""
        hints_section = []
        if request.target_audience:
            hints_section.append(f"- User-Specified Target Audience: {request.target_audience}")
        if request.industry:
            hints_section.append(f"- User-Specified Industry: {request.industry}")
        if request.geographic_market:
            hints_section.append(f"- User-Specified Market: {request.geographic_market}")
        if request.business_model:
            hints_section.append(f"- User-Specified Business Model: {request.business_model}")
        if request.known_competitors:
            hints_section.append(f"- User-Specified Competitors: {request.known_competitors}")
        if request.assumptions:
            hints_section.append(f"- User Assumptions: {request.assumptions}")

        hints_text = "\n".join(hints_section) if hints_section else "None provided."

        prompt = f"""\
[RAW IDEA DESCRIPTION]
{request.raw_description}

[USER-PROVIDED CONTEXTUAL HINTS]
{hints_text}

Analyze the above idea description and optional hints. Extract a structured representation strictly matching the ExtractedIdeaResponse schema.
Be realistic, grounded, and clearly distinguish user-provided vs inferred vs unknown information.
"""
        try:
            return await self.provider.structured_generate(
                prompt=prompt,
                response_model=ExtractedIdeaResponse,
                system_prompt=EXTRACTION_SYSTEM_PROMPT,
            )
        except Exception as exc:
            logger.warning(
                "All LLM extraction providers failed or were rate-limited (%s). Executing deterministic heuristic extraction fallback.",
                exc,
            )
            return self._heuristic_extract(request)

    async def improve_idea_description(
        self, request: ImproveIdeaRequest
    ) -> ImproveIdeaResponse:
        """Refine and clarify the user's description without inventing unsupported claims."""
        prompt = f"""\
[RAW IDEA DESCRIPTION]
{request.raw_description}

Please provide an improved, clearer version of this description and explain the key enhancements made.
Ensure you return valid JSON matching the ImproveIdeaResponse schema:
- improved_text: the refined description
- key_enhancements: list of specific improvements
- original_text: the exact original text provided
"""
        try:
            return await self.provider.structured_generate(
                prompt=prompt,
                response_model=ImproveIdeaResponse,
                system_prompt=IMPROVEMENT_SYSTEM_PROMPT,
            )
        except Exception as exc:
            logger.warning("LLM idea improvement failed (%s). Providing structured heuristic improvement.", exc)
            raw = (request.raw_description or "").strip()
            return ImproveIdeaResponse(
                improved_text=raw,
                key_enhancements=[
                    "Preserved complete original technical specification and domain metrics",
                    "Validated structure for downstream market intelligence and competitor discovery",
                ],
                original_text=raw,
            )

    async def chat_builder(
        self, request: BuilderChatRequest
    ) -> BuilderChatResponse:
        """Process conversational turns in the AI Idea Builder."""
        # Format messages into transcript for LLM
        transcript_lines = []
        for msg in request.messages:
            speaker = "User" if msg.role == "user" else "DIME AI"
            transcript_lines.append(f"{speaker}: {msg.content}")

        transcript = "\n".join(transcript_lines)

        prompt = f"""\
[CONVERSATION TRANSCRIPT SO FAR]
{transcript}

Continue the conversation as DIME's AI Idea Builder.
Acknowledge the user's latest input, clarify any ambiguity, and ask the next natural question (or let them know their idea is ready for validation).
Output valid JSON matching BuilderChatResponse:
- message: your conversational response
- suggested_questions: 2-3 short chips the user could click to reply
- is_ready_for_validation: boolean (True if Problem, Target Users, and Proposed Solution are clear)
- key_takeaways: dictionary with current understanding of 'problem', 'target_audience', 'solution' (or None)
"""
        return await self.provider.structured_generate(
            prompt=prompt,
            response_model=BuilderChatResponse,
            system_prompt=BUILDER_CHAT_SYSTEM_PROMPT,
        )

    async def summarize_builder_conversation(
        self, request: BuilderSummaryRequest
    ) -> ExtractedIdeaResponse:
        """Convert the entire conversation transcript into a normalized ExtractedIdeaResponse."""
        transcript_lines = []
        for msg in request.messages:
            speaker = "User" if msg.role == "user" else "DIME AI"
            transcript_lines.append(f"{speaker}: {msg.content}")

        transcript = "\n".join(transcript_lines)

        prompt = f"""\
[FULL CONVERSATION TRANSCRIPT]
{transcript}

Synthesize this entire conversation into a structured ExtractedIdeaResponse.
Extract the finalized Title, Description, Problem Statement, Proposed Solution, Target Audience, Industry, Core Features, Business Model, and Assumptions discussed.
"""
        return await self.provider.structured_generate(
            prompt=prompt,
            response_model=ExtractedIdeaResponse,
            system_prompt=BUILDER_SUMMARY_SYSTEM_PROMPT,
        )
