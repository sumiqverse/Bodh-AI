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
