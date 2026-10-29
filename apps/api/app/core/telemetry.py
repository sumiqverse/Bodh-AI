"""Structured logging, OpenTelemetry tracing, metrics collection, and Sentry PII scrubbing."""

import logging
import re
import sys
from typing import Any

import structlog

from app.core.config import settings

# -----------------------------------------------------------------------------
# PII Scrubbing Patterns (DPDP Act 2023 Compliance)
# -----------------------------------------------------------------------------
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_IN_REGEX = re.compile(r"(?:\+91|0)?[6-9]\d{9}")
BEARER_REGEX = re.compile(r"Bearer\s+[a-zA-Z0-9._\-]+", re.IGNORECASE)


def scrub_pii_string(val: str) -> str:
    """Scrub emails, phone numbers, and bearer credentials from a string."""
    val = BEARER_REGEX.sub("Bearer [REDACTED]", val)
    val = EMAIL_REGEX.sub("[EMAIL_REDACTED]", val)
    return PHONE_IN_REGEX.sub("[PHONE_REDACTED]", val)


def pii_scrubbing_processor(
    _logger: Any,
    _method_name: str,
    event_dict: dict[str, Any],
) -> dict[str, Any]:
    """Structlog processor to sanitize sensitive personal information from logs."""
    for key, value in list(event_dict.items()):
        lower_key = key.lower()
        if any(secret in lower_key for secret in ("password", "secret", "token", "auth", "cookie")):
            event_dict[key] = "[REDACTED]"
        elif isinstance(value, str):
            event_dict[key] = scrub_pii_string(value)
        elif isinstance(value, dict):
            event_dict[key] = {
                k: "[REDACTED]" if any(s in k.lower() for s in ("password", "token", "auth"))
                else (scrub_pii_string(v) if isinstance(v, str) else v)
                for k, v in value.items()
            }
    return event_dict


# -----------------------------------------------------------------------------
# Structured Logger Configuration
# -----------------------------------------------------------------------------
def configure_telemetry() -> None:
    """Initialize structured logging, OpenTelemetry tracing, and Sentry."""
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        pii_scrubbing_processor,
    ]

    if settings.app_env in ("production", "staging"):
        # JSON formatting for cloud log routers (Google Cloud Logging / Datadog)
        processors = [
            *shared_processors,
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ]
    else:
        # Development human-readable console
        processors = [
            *shared_processors,
            structlog.dev.ConsoleRenderer(),
        ]

    structlog.configure(
        processors=processors,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        cache_logger_on_first_use=True,
    )

    # Initialize Sentry if DSN is configured
    if settings.sentry_dsn:
        try:
            import sentry_sdk  # type: ignore[import-not-found]
            from sentry_sdk.integrations.fastapi import (  # type: ignore[import-not-found]
                FastApiIntegration,
            )

            def sentry_before_send(
                event: dict[str, Any],
                _hint: dict[str, Any],
            ) -> dict[str, Any]:
                """Scrub request headers and sensitive fields before dispatching to Sentry."""
                if "request" in event and "headers" in event["request"]:
                    headers = event["request"]["headers"]
                    for header in ("authorization", "cookie", "x-api-key"):
                        if header in headers:
                            headers[header] = "[REDACTED]"
                return event

            sentry_sdk.init(
                dsn=settings.sentry_dsn,
                environment=settings.app_env,
                traces_sample_rate=settings.sentry_traces_sample_rate,
                integrations=[FastApiIntegration()],
                before_send=sentry_before_send,
                send_default_pii=False,
            )
        except ImportError:
            pass


# -----------------------------------------------------------------------------
# In-Memory Metrics Registry (Prometheus & OpenTelemetry Compatible)
# -----------------------------------------------------------------------------
class MetricsRegistry:
    """Lightweight in-memory telemetry metrics aggregator."""

    def __init__(self) -> None:
        self.request_durations: list[float] = []
        self.request_counts: dict[str, int] = {}
        self.sync_failures: int = 0
        self.llm_cost_usd: float = 0.0
        self.llm_tokens_total: int = 0

    def record_request(self, method: str, path: str, status_code: int, duration_sec: float) -> None:
        """Record an HTTP request latency and status."""
        self.request_durations.append(duration_sec)
        # Keep ring buffer of last 5000 requests to prevent unbounded memory growth
        if len(self.request_durations) > 5000:
            self.request_durations = self.request_durations[-5000:]

        key = f"{method}:{path}:{status_code}"
        self.request_counts[key] = self.request_counts.get(key, 0) + 1

    def record_sync_failure(self) -> None:
        """Increment offline sync failure counter."""
        self.sync_failures += 1

    def record_llm_usage(self, total_tokens: int, cost_usd: float) -> None:
        """Record LLM token consumption and expenditure."""
        self.llm_tokens_total += total_tokens
        self.llm_cost_usd += cost_usd

    def get_latency_percentiles(self) -> dict[str, float]:
        """Compute p50, p95, p99 latency percentiles in milliseconds."""
        if not self.request_durations:
            return {"p50_ms": 0.0, "p95_ms": 0.0, "p99_ms": 0.0}

        sorted_durations = sorted(self.request_durations)
        count = len(sorted_durations)

        def pct(p: float) -> float:
            idx = min(int(count * p), count - 1)
            return round(sorted_durations[idx] * 1000.0, 2)

        return {
            "p50_ms": pct(0.50),
            "p95_ms": pct(0.95),
            "p99_ms": pct(0.99),
        }

    def get_summary(self) -> dict[str, Any]:
        """Retrieve complete telemetry metrics summary."""
        percentiles = self.get_latency_percentiles()
        total_reqs = sum(self.request_counts.values())
        error_reqs = sum(
            count for key, count in self.request_counts.items()
            if any(key.endswith(f":{code}") for code in range(500, 600))
        )
        error_rate = (error_reqs / total_reqs * 100.0) if total_reqs > 0 else 0.0

        return {
            "total_requests": total_reqs,
            "error_rate_pct": round(error_rate, 2),
            "latency_ms": percentiles,
            "sync_failures": self.sync_failures,
            "llm_cost_usd": round(self.llm_cost_usd, 4),
            "llm_tokens_total": self.llm_tokens_total,
        }


metrics = MetricsRegistry()
logger = structlog.get_logger()
