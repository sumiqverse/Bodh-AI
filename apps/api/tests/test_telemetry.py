"""Unit tests for telemetry, OpenTelemetry metrics, and PII scrubbing."""

from app.core.telemetry import (
    MetricsRegistry,
    configure_telemetry,
    pii_scrubbing_processor,
    scrub_pii_string,
)


def test_scrub_pii_string() -> None:
    """Verify that email addresses, phone numbers, and bearer tokens are redacted."""
    raw = "User test@school.gov.in logged in with phone 9876543210 and Bearer abcd1234efgh"
    scrubbed = scrub_pii_string(raw)

    assert "test@school.gov.in" not in scrubbed
    assert "9876543210" not in scrubbed
    assert "abcd1234efgh" not in scrubbed
    assert "[EMAIL_REDACTED]" in scrubbed
    assert "[PHONE_REDACTED]" in scrubbed
    assert "Bearer [REDACTED]" in scrubbed


def test_pii_scrubbing_processor() -> None:
    """Verify that structlog processor sanitizes event dictionary."""
    event_dict = {
        "event": "Login attempt with student test@example.com",
        "password": "CleartextPassword123!",
        "token": "secret-jwt-token",
        "nested": {
            "auth_code": "code123",
            "contact": "Contact at info@domain.org",
        },
    }

    processed = pii_scrubbing_processor(None, "info", event_dict)

    assert processed["password"] == "[REDACTED]"
    assert processed["token"] == "[REDACTED]"
    assert "[EMAIL_REDACTED]" in processed["event"]
    assert processed["nested"]["auth_code"] == "[REDACTED]"
    assert "[EMAIL_REDACTED]" in processed["nested"]["contact"]


def test_metrics_registry() -> None:
    """Verify metrics recording, percentile calculation, and summaries."""
    registry = MetricsRegistry()

    # Record synthetic requests
    for i in range(100):
        # 10ms to 1000ms
        registry.record_request(
            method="GET",
            path="/api/v1/health",
            status_code=200 if i < 98 else 500,
            duration_sec=(i + 1) * 0.01,
        )

    registry.record_sync_failure()
    registry.record_llm_usage(total_tokens=150, cost_usd=0.0003)

    summary = registry.get_summary()

    assert summary["total_requests"] == 100
    assert summary["error_rate_pct"] == 2.0
    assert summary["sync_failures"] == 1
    assert summary["llm_tokens_total"] == 150
    assert summary["llm_cost_usd"] == 0.0003

    latency = summary["latency_ms"]
    assert latency["p50_ms"] > 0
    assert latency["p95_ms"] >= latency["p50_ms"]
    assert latency["p99_ms"] >= latency["p95_ms"]


def test_configure_telemetry_runs() -> None:
    """Verify that configure_telemetry initializes without throwing."""
    configure_telemetry()
