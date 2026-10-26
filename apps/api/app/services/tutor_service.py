"""AI Tutor Service: RAG retrieval, Socratic generation, safety guardrails, and resilience."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.repositories.tutor_repo import TutorRepository
from app.schemas.tutor import TutorMonthlyBudgetResponse, TutorQueryRequest, TutorResponseSchema
from app.services.tutor_prompts import TutorPromptRegistry
from app.services.tutor_provider import LLMProvider, get_llm_provider
from app.services.tutor_resilience import (
    CircuitBreaker,
    TutorBudgetTracker,
    TutorRateLimiter,
    TutorResponseCache,
    create_tutor_resilience,
)
from app.services.tutor_security import (
    ContentSafetyFilter,
    PIIScrubber,
    PromptInjectionDefender,
    TestModeProtector,
)
from app.services.tutor_translation import (
    align_terminology_with_glossary,
    lookup_glossary_terms,
)

# Shared resilience singletons across service instances
_circuit_breaker: CircuitBreaker | None = None
_rate_limiter: TutorRateLimiter | None = None
_budget_tracker: TutorBudgetTracker | None = None
_response_cache: TutorResponseCache | None = None


def _get_shared_resilience(
    settings: Settings,
) -> tuple[CircuitBreaker, TutorRateLimiter, TutorBudgetTracker, TutorResponseCache]:
    global _circuit_breaker, _rate_limiter, _budget_tracker, _response_cache
    if (
        _circuit_breaker is None
        or _rate_limiter is None
        or _budget_tracker is None
        or _response_cache is None
    ):
        _circuit_breaker, _rate_limiter, _budget_tracker, _response_cache = create_tutor_resilience(
            settings
        )
    return _circuit_breaker, _rate_limiter, _budget_tracker, _response_cache


class AITutorService:
    """Enterprise AI Socratic tutoring service with strict child safety, RAG, and resilience."""

    def __init__(
        self,
        db: AsyncSession,
        settings: Settings,
        provider: LLMProvider | None = None,
        circuit_breaker: CircuitBreaker | None = None,
        rate_limiter: TutorRateLimiter | None = None,
        budget_tracker: TutorBudgetTracker | None = None,
        response_cache: TutorResponseCache | None = None,
    ) -> None:
        self.db = db
        self.settings = settings
        self.repo = TutorRepository(db)
        self.provider = provider or get_llm_provider(settings)

        cb, limiter, budget, cache = _get_shared_resilience(settings)
        self.circuit_breaker = circuit_breaker or cb
        self.rate_limiter = rate_limiter or limiter
        self.budget_tracker = budget_tracker or budget
        self.response_cache = response_cache or cache

    async def answer_student_query(
        self,
        student_id: uuid.UUID,
        request: TutorQueryRequest,
    ) -> TutorResponseSchema:
        """Main entry point for processing student tutoring requests."""
        # 1. Privacy First: Scrub all student PII before any processing
        scrubbed_query = PIIScrubber.scrub(request.student_query)

        # 2. Safety Gate: Test Mode Protection
        if request.is_test_mode:
            refusal_text = TestModeProtector.get_test_mode_refusal(request.language)
            await self.repo.log_interaction(
                student_id=student_id,
                skill_id=request.skill_id,
                query_scrubbed=scrubbed_query,
                response_text=refusal_text,
                tokens_used=0,
                cost_usd=0.0,
                retrieval_similarity=0.0,
                flagged_injection=False,
                flagged_off_topic=False,
                static_fallback_used=False,
            )
            return TutorResponseSchema(
                can_help=False,
                explanation=refusal_text,
                refusal_reason="test_mode",
                static_fallback_used=False,
            )

        # 3. Safety Gate: Prompt Injection Defense
        if PromptInjectionDefender.detect_injection(scrubbed_query):
            refusal_text = (
                "I am your BodhAI curriculum assistant. "
                "I cannot follow instructions to ignore safety rules or alter my system role."
                if request.language == "en"
                else (
                    "मैं आपका बोधAI पाठ्यक्रम सहायक हूँ। "
                    "मैं सुरक्षा नियमों की अनदेखी करने के निर्देशों का पालन नहीं कर सकता।"
                )
            )
            await self.repo.log_interaction(
                student_id=student_id,
                skill_id=request.skill_id,
                query_scrubbed=scrubbed_query,
                response_text=refusal_text,
                tokens_used=0,
                cost_usd=0.0,
                retrieval_similarity=0.0,
                flagged_injection=True,
                flagged_off_topic=False,
                static_fallback_used=False,
            )
            return TutorResponseSchema(
                can_help=False,
                explanation=refusal_text,
                refusal_reason="prompt_injection",
                static_fallback_used=False,
            )

        # 4. Safety Gate: Age-Appropriate Content & Off-Topic Filter
        is_safe, safety_msg = ContentSafetyFilter.check_content(scrubbed_query, request.language)
        if not is_safe and safety_msg:
            await self.repo.log_interaction(
                student_id=student_id,
                skill_id=request.skill_id,
                query_scrubbed=scrubbed_query,
                response_text=safety_msg,
                tokens_used=0,
                cost_usd=0.0,
                retrieval_similarity=0.0,
                flagged_injection=False,
                flagged_off_topic=True,
                static_fallback_used=False,
            )
            return TutorResponseSchema(
                can_help=False,
                explanation=safety_msg,
                refusal_reason="off_topic",
                static_fallback_used=False,
            )

        # 5. Resilience: Rate Limiting
        allowed, limit_reason = self.rate_limiter.is_allowed(str(student_id))
        if not allowed and limit_reason:
            return TutorResponseSchema(
                can_help=False,
                explanation=limit_reason,
                refusal_reason="rate_limited",
                static_fallback_used=False,
            )

        # 6. Resilience: Monthly Budget Exhaustion Check
        if self.budget_tracker.is_budget_exhausted():
            # Gracefully fallback to static worked solution
            return await self._fallback_to_static_solution(
                student_id=student_id,
                request=request,
                scrubbed_query=scrubbed_query,
                refusal_reason="budget_exhausted",
            )

        # 7. Performance: Response Cache Lookup
        cache_key = self.response_cache.build_key(
            skill_id=str(request.skill_id),
            depth=request.depth,
            language=request.language,
            hint_level=request.hint_level,
            prompt_snippet=scrubbed_query,
        )
        cached_result = self.response_cache.get(cache_key)
        if cached_result:
            return TutorResponseSchema(**cached_result)

        # 8. RAG Retrieval: Embed query and retrieve top-k chunks with min similarity
        query_vector = await self.provider.get_embedding(scrubbed_query)
        chunks_scored = await self.repo.search_similar_chunks(
            skill_id=request.skill_id,
            query_vector=query_vector,
            language=request.language,
            top_k=self.settings.tutor_top_k,
            min_threshold=self.settings.tutor_similarity_threshold,
        )

        # ZERO GUESSING RULE: If nothing relevant is retrieved above threshold,
        # the tutor says it cannot help and shows the static worked solution (never guess).
        if not chunks_scored:
            return await self._fallback_to_static_solution(
                student_id=student_id,
                request=request,
                scrubbed_query=scrubbed_query,
                refusal_reason="low_similarity",
            )

        top_similarity = chunks_scored[0][1]
        context_chunks = [c[0].content for c in chunks_scored]
        grounded_sources = [c[0].source_type for c in chunks_scored]

        # 9. Translation: Lookup NCERT Glossary Terms
        glossary_terms = await lookup_glossary_terms(self.db, scrubbed_query)

        # 10. Resilience: Circuit Breaker Check
        if not self.circuit_breaker.can_execute():
            # Fast fallback to static worked solution without making network call
            return await self._fallback_to_static_solution(
                student_id=student_id,
                request=request,
                scrubbed_query=scrubbed_query,
                refusal_reason="circuit_breaker_open",
            )

        # 11. Prompt Assembly & LLM Generation
        system_prompt = TutorPromptRegistry.get_system_prompt(
            version="v1",
            language=request.language,
            is_test_mode=False,
        )
        sanitized_user_input = PromptInjectionDefender.sanitize_input(scrubbed_query)
        user_prompt = TutorPromptRegistry.format_user_prompt(
            student_query=sanitized_user_input,
            context_chunks=context_chunks,
            glossary_terms=glossary_terms,
            depth=request.depth,
            hint_level=request.hint_level,
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            raw_response, tokens_used, cost_usd = await self.provider.generate_chat_completion(
                messages=messages,
                temperature=0.2,
                max_tokens=600,
            )
            self.circuit_breaker.record_success()
            self.budget_tracker.record_usage(tokens=tokens_used, cost_usd=cost_usd)
        except Exception:
            self.circuit_breaker.record_failure()
            return await self._fallback_to_static_solution(
                student_id=student_id,
                request=request,
                scrubbed_query=scrubbed_query,
                refusal_reason="llm_timeout_or_error",
            )

        # 12. Multilingual Terminology Alignment
        aligned_response = align_terminology_with_glossary(
            raw_response,
            glossary_terms,
            target_language=request.language,
        )

        response_schema = TutorResponseSchema(
            can_help=True,
            explanation=aligned_response,
            scaffolded_hint=(
                f"Step {request.hint_level}: Focus on the foundational definition in your lesson."
            ),
            follow_up_question=(
                "Does this concept make sense so far, or would you like another worked example?"
            ),
            math_latex=None,
            static_fallback_used=False,
            static_worked_solution=None,
            grounded_sources=grounded_sources,
            refusal_reason=None,
            tokens_used=tokens_used,
            estimated_cost_usd=round(cost_usd, 6),
        )

        # 13. Cache and Privacy Log
        self.response_cache.set(cache_key, response_schema.model_dump())
        await self.repo.log_interaction(
            student_id=student_id,
            skill_id=request.skill_id,
            query_scrubbed=scrubbed_query,
            response_text=aligned_response,
            tokens_used=tokens_used,
            cost_usd=cost_usd,
            retrieval_similarity=top_similarity,
            flagged_injection=False,
            flagged_off_topic=False,
            static_fallback_used=False,
        )

        return response_schema

    async def _fallback_to_static_solution(
        self,
        student_id: uuid.UUID,
        request: TutorQueryRequest,
        scrubbed_query: str,
        refusal_reason: str,
    ) -> TutorResponseSchema:
        """Fallback to teacher-approved static solution when ungrounded or during LLM outage."""
        static_solution = await self.repo.get_static_worked_solution(
            skill_id=request.skill_id,
            language=request.language,
            question_id=request.question_id,
        )

        if request.language == "hi":
            explanation = (
                "मैं केवल आपके सत्यापित पाठ्यक्रम में शामिल अवधारणाओं की व्याख्या कर सकता हूँ। "
                "अटकलें लगाने के बजाय, यहाँ आपकी सहायता के लिए आधिकारिक शिक्षक-सत्यापित समाधान प्रस्तुत है:"
            )
        else:
            explanation = (
                "I can only explain concepts verified in your official curriculum. "
                "Rather than guessing, here is the verified step-by-step worked solution:"
            )

        await self.repo.log_interaction(
            student_id=student_id,
            skill_id=request.skill_id,
            query_scrubbed=scrubbed_query,
            response_text=explanation,
            tokens_used=0,
            cost_usd=0.0,
            retrieval_similarity=0.0,
            flagged_injection=False,
            flagged_off_topic=False,
            static_fallback_used=True,
        )

        return TutorResponseSchema(
            can_help=False,
            explanation=explanation,
            static_fallback_used=True,
            static_worked_solution=static_solution
            or "Refer to your NCERT textbook chapter summary for this competency.",
            grounded_sources=["static_curriculum_worked_solution"],
            refusal_reason=refusal_reason,
            tokens_used=0,
            estimated_cost_usd=0.0,
        )

    async def get_budget_status(self) -> TutorMonthlyBudgetResponse:
        """Return snapshot of monthly expenditure and alert status."""
        status = self.budget_tracker.get_budget_status()
        return TutorMonthlyBudgetResponse(
            billing_month=status["billing_month"],
            total_tokens=status["total_tokens"],
            total_cost_usd=status["total_cost_usd"],
            budget_limit_usd=status["budget_limit_usd"],
            percent_used=status["percent_used"],
            alert_triggered=status["alert_triggered"],
        )
