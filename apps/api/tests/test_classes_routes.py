"""Tests for Class management routes (/api/v1/classes)."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from app.models.auth import User


@pytest.mark.asyncio
async def test_teacher_class_lifecycle(
    client: AsyncClient,
    teacher_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test teacher creating class, listing classes, inspecting details, and rotating join code."""
    _t_user, _t_token, t_headers = teacher_auth
    _s_user, _s_token, s_headers = student_auth

    # Student cannot create class (403)
    resp_student = await client.post(
        "/api/v1/classes",
        json={"name": "Class 8B", "grade": 8, "section": "B", "academic_year": "2024-2025"},
        headers=s_headers,
    )
    assert resp_student.status_code == 403

    # Teacher creates class
    resp_create = await client.post(
        "/api/v1/classes",
        json={"name": "Class 8B", "grade": 8, "section": "B", "academic_year": "2024-2025"},
        headers=t_headers,
    )
    assert resp_create.status_code == 201
    class_data = resp_create.json()
    assert class_data["name"] == "Class 8B"
    assert "join_code" in class_data
    class_id = class_data["id"]

    # Teacher lists classes
    resp_list = await client.get("/api/v1/classes", headers=t_headers)
    assert resp_list.status_code == 200
    classes = resp_list.json()
    assert any(c["id"] == class_id for c in classes)

    # Teacher inspects class details
    resp_detail = await client.get(f"/api/v1/classes/{class_id}", headers=t_headers)
    assert resp_detail.status_code == 200
    detail = resp_detail.json()
    assert detail["id"] == class_id
    assert "students" in detail

    # 404 for non-existent class
    random_id = uuid.uuid4()
    resp_404 = await client.get(f"/api/v1/classes/{random_id}", headers=t_headers)
    assert resp_404.status_code == 404

    # Rotate join code
    old_code = class_data["join_code"]
    resp_rotate = await client.post(f"/api/v1/classes/{class_id}/rotate-code", headers=t_headers)
    assert resp_rotate.status_code == 200
    new_code = resp_rotate.json()["join_code"]
    assert new_code != old_code


@pytest.mark.asyncio
async def test_teacher_dashboard_analytics_routes(
    client: AsyncClient,
    teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test teacher dashboard API routes: heatmap, gap-clusters, early-warnings,
    suggestions, assignments, progress, export.
    """
    _t_user, _t_token, t_headers = teacher_auth

    # 1. Create class
    resp_create = await client.post(
        "/api/v1/classes",
        json={
            "name": "Analytics Class 8C",
            "grade": 8,
            "section": "C",
            "academic_year": "2024-2025",
        },
        headers=t_headers,
    )
    assert resp_create.status_code == 201
    class_id = resp_create.json()["id"]

    # 2. Heatmap
    resp_heatmap = await client.get(f"/api/v1/classes/{class_id}/heatmap", headers=t_headers)
    assert resp_heatmap.status_code == 200
    assert "matrix" in resp_heatmap.json()

    # 3. Gap clusters
    resp_clusters = await client.get(f"/api/v1/classes/{class_id}/gap-clusters", headers=t_headers)
    assert resp_clusters.status_code == 200
    assert "clusters" in resp_clusters.json()

    # 4. Early warnings
    resp_warnings = await client.get(
        f"/api/v1/classes/{class_id}/early-warnings", headers=t_headers
    )
    assert resp_warnings.status_code == 200
    assert "warnings" in resp_warnings.json()

    # 5. Suggestions & Decision
    resp_sug = await client.get(f"/api/v1/classes/{class_id}/suggestions", headers=t_headers)
    assert resp_sug.status_code == 200
    suggestions = resp_sug.json().get("suggestions", [])
    if suggestions:
        sug_id = suggestions[0]["suggestion_id"]
        resp_dec = await client.post(
            f"/api/v1/classes/{class_id}/suggestions/{sug_id}/decision",
            json={"action": "accepted", "teacher_notes": "Reviewed and agreed"},
            headers=t_headers,
        )
        assert resp_dec.status_code == 201

    # 6. Create & List assignments
    resp_create_assign = await client.post(
        f"/api/v1/classes/{class_id}/assignments",
        json={
            "title": "Fraction Revision",
            "skill_ids": ["SKILL_FRAC_01"],
            "description": "Practice set",
        },
        headers=t_headers,
    )
    assert resp_create_assign.status_code == 201

    resp_assign = await client.get(f"/api/v1/classes/{class_id}/assignments", headers=t_headers)
    assert resp_assign.status_code == 200
    assert len(resp_assign.json()) >= 1

    # 7. Progress summary
    resp_prog = await client.get(f"/api/v1/classes/{class_id}/progress-summary", headers=t_headers)
    assert resp_prog.status_code == 200
    assert "overall_mastery_pct" in resp_prog.json()

    # 8. Export CSV
    resp_csv = await client.get(f"/api/v1/classes/{class_id}/export/csv", headers=t_headers)
    assert resp_csv.status_code == 200
    assert resp_csv.headers["content-type"].startswith("text/csv")
