"""Unit tests for AI Tutor resilience engine.

Tests circuit breaker, rate limiter, cost budget, and response cache.
"""

from __future__ import annotations

import time
import uuid

from app.services.tutor_resilience import (
    CircuitBreaker,
    TutorBudgetTracker,
    TutorRateLimiter,
    TutorResponseCache,
)


def test_circuit_breaker_transitions() -> None:
    """Ensure circuit breaker transitions between CLOSED, OPEN, and HALF_OPEN correctly."""
    cb = CircuitBreaker(failure_threshold=3, recovery_time_seconds=1)

    # 1. Starts CLOSED
    assert cb.state == CircuitBreaker.STATE_CLOSED
    assert cb.can_execute() is True

    # 2. Record 2 failures (below threshold 3)
    cb.record_failure()
    cb.record_failure()
    assert cb.state == CircuitBreaker.STATE_CLOSED
    assert cb.can_execute() is True

    # 3. 3rd failure trips to OPEN
    cb.record_failure()
    assert cb.state == CircuitBreaker.STATE_OPEN
    assert cb.can_execute() is False

    # 4. Wait for recovery timeout (1 sec)
    time.sleep(1.05)
    # can_execute should now transition to HALF_OPEN
    assert cb.can_execute() is True
    assert cb.state == CircuitBreaker.STATE_HALF_OPEN

    # 5. Success in HALF_OPEN resets to CLOSED
    cb.record_success()
    assert cb.state == CircuitBreaker.STATE_CLOSED
    assert cb.can_execute() is True
    assert cb.failure_count == 0


def test_rate_limiter_per_user_and_global() -> None:
    """Ensure rate limiter throttles per-user and global excessive requests."""
    limiter = TutorRateLimiter(user_limit=2, global_limit=5)
    user_a = "student-uuid-1"
    user_b = "student-uuid-2"

    # User A: 1st and 2nd queries allowed
    allowed1, reason1 = limiter.is_allowed(user_a)
    assert allowed1 is True
    assert reason1 is None

    allowed2, _reason2 = limiter.is_allowed(user_a)
    assert allowed2 is True

    # User A: 3rd query blocked by per-user limit
    allowed3, reason3 = limiter.is_allowed(user_a)
    assert allowed3 is False
    assert reason3 is not None
    assert "per-minute limit" in reason3

    # User B is still allowed
    allowed_b, _ = limiter.is_allowed(user_b)
    assert allowed_b is True


def test_tutor_budget_tracker_alerts() -> None:
    """Ensure monthly budget tracks costs and flags alerts."""
    tracker = TutorBudgetTracker(monthly_budget_usd=10.0)

    # 1. Initial status
    status = tracker.get_budget_status()
    assert status["total_cost_usd"] == 0.0
    assert status["alert_triggered"] is False
    assert tracker.is_budget_exhausted() is False

    # 2. Add $5.00 usage (50% - no alert)
    tracker.record_usage(tokens=5000, cost_usd=5.0)
    status2 = tracker.get_budget_status()
    assert status2["total_cost_usd"] == 5.0
    assert status2["alert_triggered"] is False
    assert tracker.is_budget_exhausted() is False

    # 3. Add $3.50 usage (total $8.50 = 85% - alert triggers at >=80%)
    tracker.record_usage(tokens=3500, cost_usd=3.5)
    status3 = tracker.get_budget_status()
    assert status3["total_cost_usd"] == 8.5
    assert status3["alert_triggered"] is True
    assert tracker.is_budget_exhausted() is False

    # 4. Add $2.00 usage (total $10.50 - budget exhausted)
    tracker.record_usage(tokens=2000, cost_usd=2.0)
    assert tracker.is_budget_exhausted() is True


def test_tutor_response_cache_hit_and_miss() -> None:
    """Ensure response cache is properly keyed and returns cached hits."""
    cache = TutorResponseCache(ttl_seconds=60)
    skill_id = str(uuid.uuid4())

    key1 = cache.build_key(
        skill_id=skill_id,
        depth="standard",
        language="en",
        hint_level=1,
        prompt_snippet="Why is (-3) + (-5) equal to -8?",
    )

    # Cache miss
    assert cache.get(key1) is None

    # Store payload
    payload = {
        "can_help": True,
        "explanation": "Adding negative integers combines their absolute magnitudes.",
        "static_fallback_used": False,
    }
    cache.set(key1, payload)

    # Cache hit
    hit = cache.get(key1)
    assert hit is not None
    assert hit["explanation"] == payload["explanation"]

    # Different hint level is a cache miss
    key2 = cache.build_key(
        skill_id=skill_id,
        depth="standard",
        language="en",
        hint_level=2,
        prompt_snippet="Why is (-3) + (-5) equal to -8?",
    )
    assert cache.get(key2) is None
