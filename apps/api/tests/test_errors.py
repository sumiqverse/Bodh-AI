"""Tests for RFC 7807 Problem Details error responses."""

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from app.core.errors import (
    ConflictError,
    NotFoundError,
    RateLimitExceededError,
    register_error_handlers,
)


@pytest.mark.asyncio
async def test_not_found_error_rfc_7807() -> None:
    """Test NotFoundError produces valid application/problem+json."""
    test_app = FastAPI()
    register_error_handlers(test_app)

    @test_app.get("/test-not-found")
    async def trigger_not_found() -> None:
        raise NotFoundError("Curriculum", "MATH_UNKNOWN")

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/test-not-found")
        assert response.status_code == 404
        assert response.headers["content-type"] == "application/problem+json"
        assert "X-Request-ID" in response.headers

        data = response.json()
        assert data["type"] == "urn:bodhai:error:not-found"
        assert data["title"] == "Resource Not Found"
        assert data["status"] == 404
        assert "MATH_UNKNOWN" in data["detail"]
        assert data["instance"] == "/test-not-found"


@pytest.mark.asyncio
async def test_conflict_error_rfc_7807() -> None:
    """Test ConflictError produces valid RFC 7807 response."""
    test_app = FastAPI()
    register_error_handlers(test_app)

    @test_app.post("/test-conflict")
    async def trigger_conflict() -> None:
        raise ConflictError("An attempt with this idempotency key already exists.")

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://testserver",
    ) as client:
        response = await client.post("/test-conflict")
        assert response.status_code == 409
        assert response.headers["content-type"] == "application/problem+json"

        data = response.json()
        assert data["type"] == "urn:bodhai:error:conflict"
        assert data["title"] == "Resource Conflict"
        assert data["status"] == 409


@pytest.mark.asyncio
async def test_rate_limit_error_rfc_7807() -> None:
    """Test RateLimitExceededError produces 429 problem detail."""
    test_app = FastAPI()
    register_error_handlers(test_app)

    @test_app.get("/test-rate-limit")
    async def trigger_rate_limit() -> None:
        raise RateLimitExceededError()

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/test-rate-limit")
        assert response.status_code == 429
        assert response.headers["content-type"] == "application/problem+json"

        data = response.json()
        assert data["type"] == "urn:bodhai:error:rate-limit-exceeded"
        assert data["title"] == "Rate Limit Exceeded"
        assert data["status"] == 429


@pytest.mark.asyncio
async def test_request_validation_error_rfc_7807() -> None:
    """Test invalid request payload produces 422 with invalid_params list."""
    test_app = FastAPI()
    register_error_handlers(test_app)

    from pydantic import BaseModel, Field

    class SampleBody(BaseModel):
        score: float = Field(ge=0, le=1)

    @test_app.post("/test-validation")
    async def trigger_validation(body: SampleBody) -> dict[str, float]:
        return {"score": body.score}

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://testserver",
    ) as client:
        response = await client.post("/test-validation", json={"score": 5.0})
        assert response.status_code == 422
        assert response.headers["content-type"] == "application/problem+json"

        data = response.json()
        assert data["type"] == "urn:bodhai:error:validation-failed"
        assert data["title"] == "Unprocessable Content"
        assert "invalid_params" in data
        assert len(data["invalid_params"]) > 0
        assert "body.score" in data["invalid_params"][0]["name"]


@pytest.mark.asyncio
async def test_http_exception_variations() -> None:
    """Test standard HTTPExceptions (401, 403, 404, 429) format correctly."""
    test_app = FastAPI()
    register_error_handlers(test_app)

    @test_app.get("/test-http/{code}")
    async def trigger_http(code: int) -> None:
        raise HTTPException(status_code=code, detail=f"HTTP test error {code}")

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://testserver",
    ) as client:
        for code, expected_title in [
            (401, "Unauthorized"),
            (403, "Forbidden"),
            (404, "Not Found"),
            (429, "Rate Limit Exceeded"),
            (400, "HTTP Error"),
        ]:
            response = await client.get(f"/test-http/{code}")
            assert response.status_code == code
            data = response.json()
            assert data["title"] == expected_title
            assert data["status"] == code


@pytest.mark.asyncio
async def test_unhandled_exception_rfc_7807() -> None:
    """Test unexpected exception produces 500 problem detail."""
    test_app = FastAPI()
    register_error_handlers(test_app)

    @test_app.get("/test-unhandled")
    async def trigger_unhandled() -> None:
        raise RuntimeError("Unexpected failure")

    async with AsyncClient(
        transport=ASGITransport(app=test_app, raise_app_exceptions=False),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/test-unhandled")
        assert response.status_code == 500
        assert response.headers["content-type"] == "application/problem+json"

        data = response.json()
        assert data["type"] == "urn:bodhai:error:internal-server-error"
        assert data["title"] == "Internal Server Error"
        assert data["status"] == 500
        assert "request_id" in data
