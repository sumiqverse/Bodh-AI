"""Failure injection tests verifying graceful degradation when infrastructure dependencies fail.

Simulates:
1. PostgreSQL failure (DB connection drop / query timeout) -> Readiness degraded (503).
2. Redis failure (Redis connection timeout / server down) -> Rate limiter degrades gracefully.
3. LLM Provider failure (API timeout / 5xx error) -> Circuit breaker trips, fallback served.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import Request
from httpx import AsyncClient
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.middleware import RedisRateLimiter
from app.db.redis import check_redis_health
from app.db.session import check_db_health
from app.schemas.tutor import TutorQueryRequest
from app.services.readiness_service import ReadinessService
from app.services.tutor_provider import LLMProvider
from app.services.tutor_resilience import CircuitBreaker
from app.services.tutor_service import AITutorService


@pytest.mark.asyncio
async def test_failure_injection_db_down_readiness_probe(client: AsyncClient) -> None:
    """When PostgreSQL is down or unreachable, GET /ready must return 503 with degraded status.

    Crucially, it must not leak credentials, connection URIs, or internal stack traces.
    """
    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.execute.side_effect = OperationalError(
        statement="SELECT 1",
        params={},
        orig=Exception(
            "could not connect to server: Connection refused (postgresql://user:secret_pass@127.0.0.1:5432/db)"
        ),
    )

    # 1. Probe function directly
    is_healthy = await check_db_health(mock_session)
    assert is_healthy is False

    # 2. Readiness service evaluation
    with (
        patch("app.services.readiness_service.check_db_health", new=AsyncMock(return_value=False)),
        patch(
            "app.services.readiness_service.check_redis_health", new=AsyncMock(return_value=True)
        ),
    ):
        ready_response = await ReadinessService.evaluate_readiness(mock_session)
        assert ready_response.status == "degraded"
        assert ready_response.database is False
        assert ready_response.redis is True

    # 3. HTTP endpoint call
    with (
        patch("app.services.readiness_service.check_db_health", new=AsyncMock(return_value=False)),
        patch(
            "app.services.readiness_service.check_redis_health", new=AsyncMock(return_value=True)
        ),
    ):
        res = await client.get("/ready")
        assert res.status_code == 503
        data = res.json()
        assert data["status"] == "degraded"
        assert data["database"] is False
        # Verify no credentials leaked
        assert "secret_pass" not in res.text
        assert "postgresql://" not in res.text


@pytest.mark.asyncio
async def test_failure_injection_redis_down_graceful_degradation() -> None:
    """When Redis is down, rate limiter must fail open and ready probe must report degraded."""
    # 1. check_redis_health probe fails safely
    mock_redis = AsyncMock()
    mock_redis.ping.side_effect = ConnectionError(
        "Error 111 connecting to 127.0.0.1:6379. Connection refused."
    )
    is_redis_ok = await check_redis_health(mock_redis)
    assert is_redis_ok is False

    # 2. RedisRateLimiter gracefully degrades when redis client raises network exceptions
    limiter = RedisRateLimiter()

    # Build mock request
    mock_request = MagicMock(spec=Request)
    mock_request.url.path = "/api/v1/curricula"
    mock_request.headers.get.return_value = "203.0.113.195"
    mock_request.app.state.redis = AsyncMock()
    mock_request.app.state.redis.incr.side_effect = ConnectionError("Redis server unreachable")

    # The rate limiter must not raise ConnectionError; it must swallow and log warning
    try:
        await limiter.check_rate_limit(mock_request)
    except Exception as exc:  # pragma: no cover
        pytest.fail(f"RedisRateLimiter did not degrade gracefully: {exc}")


@pytest.mark.asyncio
async def test_failure_injection_llm_down_circuit_breaker_trips_and_serves_fallback(
    db_session: AsyncSession,
) -> None:
    """When LLM provider experiences network timeout or 500 error:

    1. TutorService records the failure and returns a static worked pedagogical solution.
    2. Consecutive failures trip the circuit breaker into OPEN state.
    3. Subsequent requests are short-circuited to static solutions without network overhead.
    """
    mock_provider = AsyncMock(spec=LLMProvider)
    # Simulate LLM provider connection failure
    mock_provider.generate_chat_completion.side_effect = TimeoutError(
        "Gemini / LLM API gateway timed out after 10000ms"
    )

    # Use a circuit breaker with failure threshold 2 for testing
    cb = CircuitBreaker(failure_threshold=2, recovery_time_seconds=10)

    from app.core.config import get_settings

    settings = get_settings()
    tutor = AITutorService(
        db=db_session,
        settings=settings,
        provider=mock_provider,
        circuit_breaker=cb,
    )

    student_id = uuid.uuid4()
    req = TutorQueryRequest(
        skill_id=uuid.uuid4(),
        student_query="Explain how to solve linear equations step by step",
        depth="standard",
        hint_level=1,
        language="en",
    )

    mock_chunk = MagicMock()
    mock_chunk.content = "Linear equations concept explanation"
    mock_chunk.source_type = "curriculum_notes"

    mock_provider.get_embedding.return_value = [0.1] * 384

    with (
        patch.object(
            tutor.repo, "search_similar_chunks", new=AsyncMock(return_value=[(mock_chunk, 0.95)])
        ),
        patch.object(
            tutor.repo,
            "get_static_worked_solution",
            new=AsyncMock(return_value="Step 1: Isolate x."),
        ),
        patch.object(tutor.repo, "log_interaction", new=AsyncMock(return_value=None)),
        patch("app.services.tutor_service.lookup_glossary_terms", new=AsyncMock(return_value=[])),
    ):
        # Request 1: LLM fails -> returns fallback response, records 1 failure
        resp1 = await tutor.answer_student_query(student_id=student_id, request=req)
        assert resp1.static_fallback_used is True
        assert resp1.refusal_reason == "llm_timeout_or_error"
        assert cb.state == CircuitBreaker.STATE_CLOSED
        assert cb.failure_count == 1

        # Request 2: LLM fails again -> trips circuit breaker to OPEN
        resp2 = await tutor.answer_student_query(student_id=student_id, request=req)
        assert resp2.static_fallback_used is True
        assert resp2.refusal_reason == "llm_timeout_or_error"
        assert cb.state == CircuitBreaker.STATE_OPEN

        # Request 3: Circuit breaker is OPEN -> provider is NOT even called!
        call_count_before = mock_provider.generate_chat_completion.call_count
        resp3 = await tutor.answer_student_query(student_id=student_id, request=req)
        assert resp3.static_fallback_used is True
        assert resp3.refusal_reason == "circuit_breaker_open"
        # Verify provider was not invoked on tripped circuit
        assert mock_provider.generate_chat_completion.call_count == call_count_before
