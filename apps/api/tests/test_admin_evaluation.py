"""Tests for admin telemetry, evaluation dashboard, and feedback routes."""

import pytest
from httpx import AsyncClient

from app.models.auth import User


@pytest.mark.asyncio
async def test_admin_telemetry_endpoint(
    client: AsyncClient,
    admin_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Verify that admin can fetch live operational telemetry metrics."""
    _admin, _token, admin_headers = admin_auth
    response = await client.get("/api/v1/admin/telemetry", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_requests" in data
    assert "latency_ms" in data
    assert "error_rate_pct" in data


@pytest.mark.asyncio
async def test_admin_evaluation_endpoint(
    client: AsyncClient,
    admin_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Verify that admin can fetch ROC-AUC, ECE, and calibration bins."""
    _admin, _token, admin_headers = admin_auth
    response = await client.get("/api/v1/admin/evaluation", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "auc" in data
    assert "ece" in data
    assert "bins" in data
    assert len(data["bins"]) == 10
    assert data["student_count"] > 0
    assert 0.0 <= data["auc"] <= 1.0
    assert 0.0 <= data["ece"] <= 1.0


@pytest.mark.asyncio
async def test_admin_feedback_submission(client: AsyncClient) -> None:
    """Verify that public/pilot feedback endpoint accepts ratings and comments."""
    payload = {
        "category": "suggestion",
        "rating": 5,
        "comment": "Class 8 fractions diagnostic was extremely clear!",
    }
    response = await client.post("/api/v1/admin/feedback", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "received"
