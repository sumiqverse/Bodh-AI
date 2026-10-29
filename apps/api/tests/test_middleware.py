"""Tests for API middleware: Request ID, Security Headers, and Rate Limiting."""

import uuid
from unittest.mock import MagicMock

import pytest
from fastapi import Request
from httpx import AsyncClient

from app.core.errors import RateLimitExceededError
from app.core.middleware import RedisRateLimiter
from tests.conftest import MockRedis


def _make_request(
    path: str = "/api/v1/curricula",
    client_ip: str = "192.168.1.100",
    redis_client: object | None = None,
) -> MagicMock:
    req = MagicMock(spec=Request)
    req.url.path = path
    req.headers = {"X-Forwarded-For": client_ip}
    req.client = MagicMock()
    req.client.host = client_ip
    req.app.state.redis = redis_client
    return req


@pytest.mark.asyncio
async def test_request_id_generated_when_missing(client: AsyncClient) -> None:
    """Ensure response contains a valid X-Request-ID header when client doesn't send one."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert "x-request-id" in response.headers
    req_id = response.headers["x-request-id"]
    parsed = uuid.UUID(req_id)
    assert str(parsed) == req_id


@pytest.mark.asyncio
async def test_request_id_preserved_when_supplied(client: AsyncClient) -> None:
    """Ensure supplied X-Request-ID header is echoed back on the response."""
    custom_id = str(uuid.uuid4())
    response = await client.get("/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers["x-request-id"] == custom_id


@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient) -> None:
    """Ensure OWASP recommended security headers are present on all responses."""
    response = await client.get("/health")
    assert response.status_code == 200

    headers = response.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert "max-age=31536000" in headers.get("strict-transport-security", "")
    assert "default-src 'none'" in headers.get("content-security-policy", "")
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "geolocation=()" in headers.get("permissions-policy", "")
    assert headers.get("x-permitted-cross-domain-policies") == "none"


@pytest.mark.asyncio
async def test_payload_size_limit_blocks_oversized(client: AsyncClient) -> None:
    """Ensure request with content-length exceeding max bytes is rejected with 413."""
    response = await client.post(
        "/api/v1/auth/teacher/login",
        headers={"Content-Length": str(3 * 1024 * 1024)},  # 3MB > 2MB limit
        json={"email": "teacher@school.edu.in", "password": "password123"},
    )
    assert response.status_code == 413
    assert response.json()["title"] == "Payload Too Large"


@pytest.mark.asyncio
async def test_payload_size_limit_allows_normal(client: AsyncClient) -> None:
    """Ensure standard request under limit passes payload check."""
    response = await client.post(
        "/api/v1/auth/teacher/login",
        json={"email": "nonexistent@school.edu.in", "password": "password123"},
    )
    # Passed middleware, reached auth logic (401 invalid credentials)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_csrf_origin_validation_blocks_unauthorized_origin(client: AsyncClient) -> None:
    """Ensure state-changing requests from untrusted external origins are rejected with 403."""
    response = await client.post(
        "/api/v1/auth/teacher/login",
        headers={"Origin": "https://malicious-attacker.com"},
        json={"email": "teacher@school.edu.in", "password": "password123"},
    )
    assert response.status_code == 403
    assert response.json()["title"] == "Forbidden"


@pytest.mark.asyncio
async def test_csrf_origin_validation_allows_valid_origin(client: AsyncClient) -> None:
    """Ensure state-changing requests from allowed origin succeed."""
    response = await client.post(
        "/api/v1/auth/teacher/login",
        headers={"Origin": "http://localhost:3000"},
        json={"email": "nonexistent@school.edu.in", "password": "password123"},
    )
    # Passed CSRF check and reached auth handler
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_rate_limiter_allows_under_limit() -> None:
    """Test RedisRateLimiter allows requests within the rate limit."""
    mock_redis = MockRedis()
    limiter = RedisRateLimiter()
    original_rate = limiter.settings.rate_limit_per_minute
    try:
        limiter.settings.rate_limit_per_minute = 5
        req = _make_request("/api/v1/curricula", "192.168.1.100", mock_redis)
        for _ in range(5):
            await limiter.check_rate_limit(req)
    finally:
        limiter.settings.rate_limit_per_minute = original_rate


@pytest.mark.asyncio
async def test_rate_limiter_blocks_over_limit() -> None:
    """Test RedisRateLimiter raises RateLimitExceededError when limit is exceeded."""
    mock_redis = MockRedis()
    limiter = RedisRateLimiter()
    original_rate = limiter.settings.rate_limit_per_minute
    try:
        limiter.settings.rate_limit_per_minute = 3
        req = _make_request("/api/v1/attempts", "192.168.1.101", mock_redis)
        for _ in range(3):
            await limiter.check_rate_limit(req)

        with pytest.raises(RateLimitExceededError) as exc_info:
            await limiter.check_rate_limit(req)
        assert exc_info.value.status_code == 429
    finally:
        limiter.settings.rate_limit_per_minute = original_rate


@pytest.mark.asyncio
async def test_rate_limiter_skips_excluded_paths() -> None:
    """Test RedisRateLimiter bypasses excluded probe endpoints."""
    mock_redis = MockRedis()
    limiter = RedisRateLimiter()
    original_rate = limiter.settings.rate_limit_per_minute
    try:
        limiter.settings.rate_limit_per_minute = 1
        for path in ["/health", "/ready"]:
            req = _make_request(path, "192.168.1.102", mock_redis)
            # Should never raise even if called repeatedly
            await limiter.check_rate_limit(req)
            await limiter.check_rate_limit(req)
    finally:
        limiter.settings.rate_limit_per_minute = original_rate


@pytest.mark.asyncio
async def test_rate_limiter_fails_open_when_redis_none() -> None:
    """Test RedisRateLimiter fails open when Redis is unavailable (None)."""
    limiter = RedisRateLimiter()
    req = _make_request("/api/v1/curricula", "192.168.1.103", None)
    # Should complete without error
    await limiter.check_rate_limit(req)
