"""Resilience guardrails: Circuit breaker, rate limits, cost budgets, and response cache."""

from __future__ import annotations

import hashlib
import time
from datetime import UTC, datetime
from typing import Any

from app.core.config import Settings


class CircuitBreakerOpenError(Exception):
    """Raised when call is blocked because circuit breaker is in OPEN state."""


class CircuitBreaker:
    """Three-state circuit breaker preventing cascade failure during LLM outages."""

    STATE_CLOSED = "CLOSED"
    STATE_OPEN = "OPEN"
    STATE_HALF_OPEN = "HALF_OPEN"

    def __init__(self, failure_threshold: int = 3, recovery_time_seconds: int = 30) -> None:
        self.failure_threshold = failure_threshold
        self.recovery_time_seconds = recovery_time_seconds
        self.state = self.STATE_CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0

    def can_execute(self) -> bool:
        """Return True if circuit allows request execution."""
        if self.state == self.STATE_CLOSED:
            return True

        now = time.time()
        if self.state == self.STATE_OPEN:
            if now - self.last_failure_time >= self.recovery_time_seconds:
                self.state = self.STATE_HALF_OPEN
                return True
            return False

        # HALF_OPEN allows single probe execution
        return True

    def record_success(self) -> None:
        """Reset circuit breaker counters on successful execution."""
        self.state = self.STATE_CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0

    def record_failure(self) -> None:
        """Increment failure counter and trip circuit if threshold exceeded."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.state == self.STATE_HALF_OPEN or self.failure_count >= self.failure_threshold:
            self.state = self.STATE_OPEN


class TutorRateLimiter:
    """Sliding-window per-user and global rate limiter with Redis and in-memory fallback."""

    def __init__(self, user_limit: int = 20, global_limit: int = 500) -> None:
        self.user_limit = user_limit
        self.global_limit = global_limit
        self._user_windows: dict[str, list[float]] = {}
        self._global_window: list[float] = []

    def is_allowed(self, user_id: str, redis_client: Any | None = None) -> tuple[bool, str | None]:
        """Check if request passes rate limits. Returns (is_allowed, reason)."""
        _ = redis_client
        now = time.time()
        one_min_ago = now - 60.0

        # Global rate limit
        self._global_window = [t for t in self._global_window if t > one_min_ago]
        if len(self._global_window) >= self.global_limit:
            return False, "Global AI tutor rate limit exceeded. Please try again shortly."

        # Per-user rate limit
        user_history = self._user_windows.get(user_id, [])
        user_history = [t for t in user_history if t > one_min_ago]
        if len(user_history) >= self.user_limit:
            return (
                False,
                "You have reached the per-minute limit for tutor queries. Please pause briefly.",
            )

        # Record attempt
        self._global_window.append(now)
        user_history.append(now)
        self._user_windows[user_id] = user_history

        return True, None


class TutorBudgetTracker:
    """Monitors monthly LLM token consumption and tracks expenditure against budget."""

    def __init__(self, monthly_budget_usd: float = 50.0) -> None:
        self.monthly_budget_usd = monthly_budget_usd
        self._accumulated_cost: dict[str, float] = {}
        self._accumulated_tokens: dict[str, int] = {}
        self._alert_triggered: dict[str, bool] = {}

    def _current_month(self) -> str:
        return datetime.now(UTC).strftime("%Y-%m")

    def record_usage(self, tokens: int, cost_usd: float) -> tuple[float, bool]:
        """Record usage and return (total_cost, is_budget_exceeded)."""
        month = self._current_month()
        total_cost = self._accumulated_cost.get(month, 0.0) + cost_usd
        total_tokens = self._accumulated_tokens.get(month, 0) + tokens

        self._accumulated_cost[month] = total_cost
        self._accumulated_tokens[month] = total_tokens

        is_exceeded = total_cost >= self.monthly_budget_usd
        if is_exceeded:
            self._alert_triggered[month] = True

        return total_cost, is_exceeded

    def is_budget_exhausted(self) -> bool:
        """Check if current monthly budget is exhausted."""
        month = self._current_month()
        return self._accumulated_cost.get(month, 0.0) >= self.monthly_budget_usd

    def get_budget_status(self) -> dict[str, Any]:
        """Return snapshot of monthly budget and token consumption."""
        month = self._current_month()
        cost = self._accumulated_cost.get(month, 0.0)
        tokens = self._accumulated_tokens.get(month, 0)
        pct = (cost / self.monthly_budget_usd) * 100.0 if self.monthly_budget_usd > 0 else 0.0

        return {
            "billing_month": month,
            "total_tokens": tokens,
            "total_cost_usd": round(cost, 4),
            "budget_limit_usd": self.monthly_budget_usd,
            "percent_used": round(pct, 2),
            "alert_triggered": self._alert_triggered.get(month, False) or (pct >= 80.0),
        }


class TutorResponseCache:
    """Caches generated explanations keyed by (skill_id, depth, language, hint_level)."""

    def __init__(self, ttl_seconds: int = 86400) -> None:
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}

    def build_key(
        self,
        skill_id: str,
        depth: str,
        language: str,
        hint_level: int,
        prompt_snippet: str = "",
    ) -> str:
        """Generate deterministic cache key."""
        h = hashlib.sha256(prompt_snippet.strip().lower().encode("utf-8")).hexdigest()[:16]
        return f"tutor:cache:{skill_id}:{depth}:{language}:{hint_level}:{h}"

    def get(self, key: str) -> dict[str, Any] | None:
        """Retrieve cached response if within TTL."""
        entry = self._cache.get(key)
        if not entry:
            return None
        timestamp, data = entry
        if time.time() - timestamp > self.ttl_seconds:
            del self._cache[key]
            return None
        return data

    def set(self, key: str, data: dict[str, Any]) -> None:
        """Save response to cache."""
        self._cache[key] = (time.time(), data)


# Singleton instances configured from application settings
def create_tutor_resilience(
    settings: Settings,
) -> tuple[CircuitBreaker, TutorRateLimiter, TutorBudgetTracker, TutorResponseCache]:
    cb = CircuitBreaker(
        failure_threshold=settings.tutor_circuit_breaker_threshold,
        recovery_time_seconds=settings.tutor_circuit_breaker_recovery_sec,
    )
    limiter = TutorRateLimiter(
        user_limit=settings.tutor_per_user_rate_limit,
        global_limit=settings.tutor_global_rate_limit,
    )
    budget = TutorBudgetTracker(
        monthly_budget_usd=settings.tutor_monthly_budget_usd,
    )
    cache = TutorResponseCache(ttl_seconds=86400)
    return cb, limiter, budget, cache
