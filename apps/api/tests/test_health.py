"""Tests for the /health and /ready endpoints."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_returns_ok(client: AsyncClient) -> None:
    """Ensure GET /health returns HTTP 200 with status 'ok' and application metadata."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "BodhAI API"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_ready_check_all_healthy(client: AsyncClient) -> None:
    """Ensure GET /ready returns HTTP 200 when database and redis are healthy."""
    with patch(
        "app.services.readiness_service.check_redis_health",
        new=AsyncMock(return_value=True),
    ):
        response = await client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["database"] is True
        assert data["redis"] is True


@pytest.mark.asyncio
async def test_ready_check_degraded_returns_503(client: AsyncClient) -> None:
    """Ensure GET /ready returns HTTP 503 when a dependency is degraded."""
    with (
        patch(
            "app.services.readiness_service.check_db_health",
            new=AsyncMock(return_value=False),
        ),
        patch(
            "app.services.readiness_service.check_redis_health",
            new=AsyncMock(return_value=True),
        ),
    ):
        response = await client.get("/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"] is False
        assert data["redis"] is True
