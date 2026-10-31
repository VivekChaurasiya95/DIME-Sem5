"""
DIME Backend - LLM Provider (Phase 10).
"""

import asyncio
import logging
import re
import json
from typing import TypeVar, Type, cast

from pydantic import BaseModel
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models import BaseChatModel

from backend.core.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMProvider:
    """
    Wrapper around multiple LLM providers (OpenAI, Groq, Gemini, Nvidia)
    using LangChain's structured output capabilities.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.provider_name = self.settings.llm_provider_name.lower()
        self.model_name = self.settings.llm_model_name
        self.temperature = self.settings.llm_temperature
        self.llm = self._initialize_llm()

    def _build_llm(self, provider: str, model: str | None = None) -> BaseChatModel | None:
        """Instantiate a chat model for a given provider with defensive defaults."""
        p = provider.lower()
        if p == "openai" and self.settings.openai_api_key:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                api_key=self.settings.openai_api_key,
                model=model or "gpt-4o-mini",
                temperature=self.temperature,
            )
        elif p == "groq" and self.settings.groq_api_key:
            from langchain_openai import ChatOpenAI
            # Use qwen/qwen3.8-27b by default on Groq for high accuracy and reliable JSON output
            target_model = model if model and model not in ("llama3-8b-8192", "nvidia/nemotron-3.5-lightning:free") else "qwen/qwen3.8-27b"
            return ChatOpenAI(
                api_key=self.settings.groq_api_key,
                base_url="https://api.groq.com/openai/v1",
                model=target_model,
                temperature=self.temperature,
                max_tokens=1024,
            )
        elif p == "nvidia" and self.settings.nvidia_api_key:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                api_key=self.settings.nvidia_api_key,
                base_url="https://openrouter.ai/api/v1",
                model=model or "nvidia/nemotron-3.5-lightning:free",
                temperature=self.temperature,
                extra_body={"reasoning": {"effort": "none"}},
            )
        elif p == "gemini" and self.settings.google_api_key:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                api_key=self.settings.google_api_key,
                model=model or "gemini-1.5-flash",
                temperature=self.temperature,
            )
        return None

    def _initialize_llm(self) -> BaseChatModel:
        """Initialize the requested primary LangChain LLM."""
        llm = self._build_llm(self.provider_name, self.model_name)
        if llm is not None:
            return llm
        
        # Fallback to any provider with an available API key
        if self.settings.groq_api_key:
            logger.info("Defaulting primary LLM to Groq (qwen/qwen3.8-27b)")
            built = self._build_llm("groq", "qwen/qwen3.8-27b")
            if built:
                return built

        if self.settings.nvidia_api_key:
            logger.info("Defaulting primary LLM to Nvidia (OpenRouter)")
            built = self._build_llm("nvidia", "nvidia/nemotron-3.5-lightning:free")
            if built:
                return built

        raise ValueError(f"No configured or usable LLM provider found for: {self.provider_name}")

    def _get_candidate_llms(self) -> list[tuple[str, BaseChatModel]]:
        """Constructs an ordered list of candidate (provider_name, llm) pairs for automatic failover."""
        candidates: list[tuple[str, BaseChatModel]] = [(self.provider_name, self.llm)]
        seen_providers = {self.provider_name}

        # Backup 1: Groq
        if "groq" not in seen_providers and self.settings.groq_api_key:
            groq_llm = self._build_llm("groq", "qwen/qwen3.8-27b")
            if groq_llm:
                candidates.append(("groq", groq_llm))
                seen_providers.add("groq")

        # Backup 2: Nvidia / OpenRouter
        if "nvidia" not in seen_providers and self.settings.nvidia_api_key:
            nv_llm = self._build_llm("nvidia", "nvidia/nemotron-3.5-lightning:free")
            if nv_llm:
                candidates.append(("nvidia", nv_llm))
                seen_providers.add("nvidia")

        # Backup 3: OpenAI
        if "openai" not in seen_providers and self.settings.openai_api_key:
            oa_llm = self._build_llm("openai", "gpt-4o-mini")
            if oa_llm:
                candidates.append(("openai", oa_llm))
                seen_providers.add("openai")

        return candidates

    def _extract_model_from_text(self, text: str, response_model: Type[T]) -> T:
        """Helper to extract and validate Pydantic model from raw LLM text."""
        cleaned = text.strip()
        if "```" in cleaned:
            fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL)
            if fence_match:
                cleaned = fence_match.group(1).strip()
            else:
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned)

        first_brace = cleaned.find("{")
        last_brace = cleaned.rfind("}")
        if first_brace != -1 and last_brace != -1:
            cleaned = cleaned[first_brace : last_brace + 1]

        try:
            return response_model.model_validate_json(cleaned)
        except Exception:
            # Loose parse fallback
            parsed_dict = json.loads(cleaned)
            if isinstance(parsed_dict, dict):
                return response_model.model_validate(parsed_dict)
            raise

    async def structured_generate(
        self,
        prompt: str,
        response_model: Type[T],
        system_prompt: str = "You are an analytical AI assistant.",
    ) -> T:
        """
        Generates a structured Pydantic response with automatic provider failover on rate limits or errors.
        """
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt),
        ]

        candidates = self._get_candidate_llms()
        last_error: Exception | None = None

        for prov_name, candidate_llm in candidates:
            # 1. Attempt structured output
            try:
                structured_llm = candidate_llm.with_structured_output(response_model, include_raw=True)
                res_dict = await asyncio.wait_for(structured_llm.ainvoke(messages), timeout=60.0)

                # Direct parsed match
                if isinstance(res_dict, dict) and res_dict.get("parsed") is not None:
                    parsed = res_dict["parsed"]
                    if isinstance(parsed, response_model):
                        return parsed
                    if isinstance(parsed, dict):
                        return response_model.model_validate(parsed)
                    return cast(T, parsed)

                if isinstance(res_dict, response_model):
                    return res_dict

                # Parse from raw message content inside structured result
                raw_msg = res_dict.get("raw") if isinstance(res_dict, dict) else None
                raw_text = getattr(raw_msg, "content", None) if raw_msg else None
                if isinstance(raw_text, str) and raw_text.strip():
                    try:
                        return self._extract_model_from_text(raw_text, response_model)
                    except Exception as parse_err:
                        logger.warning(f"Failed to parse raw text on {prov_name}: {parse_err}")
            except Exception as struct_err:
                last_error = struct_err
                logger.warning(
                    f"Structured LLM invocation failed for {prov_name} ({struct_err}). Trying fallback on {prov_name}."
                )

            # 2. Fallback: Direct raw ainvoke with JSON format instruction
            try:
                fallback_messages = [
                    SystemMessage(
                        content=f"{system_prompt}\nYou MUST output valid JSON conforming strictly to the requested schema."
                    ),
                    HumanMessage(
                        content=f"{prompt}\n\nPlease respond with a valid JSON object matching the required schema."
                    ),
                ]
                raw_invoke = await asyncio.wait_for(candidate_llm.ainvoke(fallback_messages), timeout=60.0)
                if hasattr(raw_invoke, "content") and isinstance(raw_invoke.content, str):
                    return self._extract_model_from_text(raw_invoke.content, response_model)
            except Exception as raw_err:
                last_error = raw_err
                logger.warning(f"Raw prompt fallback also failed for {prov_name}: {raw_err}")

            logger.info(f"Failing over from {prov_name} to next candidate LLM provider.")

        raise ValueError(
            f"All LLM providers ({', '.join(p[0] for p in candidates)}) failed to produce valid output for {response_model.__name__}. Last error: {last_error}"
        )
