"""Tests for curriculum graph endpoint and bulk import route."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.curriculum import Curriculum, Prerequisite, Skill, Topic


@pytest.fixture
async def seeded_graph_data(db_session: AsyncSession) -> Curriculum:
    """Seed curriculum with topics, skills, and prerequisite edges."""
    uid = uuid.uuid4().hex[:8]
    curr = Curriculum(
        code=f"GRAPH-CURR-{uid}",
        board="CBSE",
        grade=8,
        subject="mathematics",
        version="1.0",
    )
    db_session.add(curr)
    await db_session.flush()

    topic1 = Topic(
        curriculum_id=curr.id, code=f"TOPIC-G1-{uid}", name="Algebra Foundations", sequence_order=1
    )
    topic2 = Topic(
        curriculum_id=curr.id, code=f"TOPIC-G2-{uid}", name="Linear Equations", sequence_order=2
    )
    db_session.add_all([topic1, topic2])
    await db_session.flush()

    skill1 = Skill(
        topic_id=topic1.id,
        code=f"SKILL-G1-{uid}",
        name="Variables",
        description="Understanding variables",
        difficulty=0.3,
        blooms_level="remember",
    )
    skill2 = Skill(
        topic_id=topic2.id,
        code=f"SKILL-G2-{uid}",
        name="Solving Equations",
        description="Solving linear equations",
        difficulty=0.6,
        blooms_level="apply",
    )
    db_session.add_all([skill1, skill2])
    await db_session.flush()

    prereq = Prerequisite(
        parent_skill_id=skill1.id,
        child_skill_id=skill2.id,
        relation_type="hard",
    )
    db_session.add(prereq)
    await db_session.commit()
    return curr


@pytest.mark.asyncio
async def test_get_curriculum_graph(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
    seeded_graph_data: Curriculum,
) -> None:
    """Graph endpoint returns nodes (topics and skills) and directed prerequisite edges."""
    _user, _token, headers = student_auth
    curr = seeded_graph_data

    resp = await client.get(f"/api/v1/curricula/{curr.code}/graph", headers=headers)
    assert resp.status_code == 200

    data = resp.json()
    assert data["curriculum_code"] == curr.code
    assert len(data["nodes"]) >= 4  # 2 topics + 2 skills
    assert len(data["edges"]) >= 1  # 1 prerequisite edge

    types = {n["type"] for n in data["nodes"]}
    assert "topic" in types
    assert "skill" in types


@pytest.mark.asyncio
async def test_bulk_import_endpoint_permissions(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
    teacher_auth: tuple[User, str, dict[str, str]],
    admin_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Only administrators can import shared curriculum content."""
    _s_user, _s_token, s_headers = student_auth
    _t_user, _t_token, t_headers = teacher_auth
    _a_user, _a_token, a_headers = admin_auth

    uid = uuid.uuid4().hex[:8]
    payload = {
        "curriculum": {
            "code": f"IMPORT-TEST-{uid}",
            "board": "CBSE",
            "grade": 8,
            "subject": "mathematics",
            "version": "1.0",
        },
        "topics": [{"code": f"TOPIC-IMP-{uid}", "name": "Import Topic", "sequence_order": 1}],
        "skills": [
            {
                "code": f"SKILL-IMP-{uid}",
                "topic_code": f"TOPIC-IMP-{uid}",
                "name": "Import Skill",
                "description": "Testing web bulk import endpoint",
                "difficulty": 0.5,
                "blooms_level": "understand",
                "prerequisites": [],
            }
        ],
        "glossary": [],
        "questions": [],
    }

    # Student receives 403 Forbidden
    resp_student = await client.post("/api/v1/curricula/import", json=payload, headers=s_headers)
    assert resp_student.status_code == 403

    # Teachers manage classroom-specific content, not the shared curriculum.
    resp_teacher = await client.post(
        "/api/v1/curricula/import?dry_run=true", json=payload, headers=t_headers
    )
    assert resp_teacher.status_code == 403
    resp_admin = await client.post(
        "/api/v1/curricula/import?dry_run=true", json=payload, headers=a_headers
    )
    assert resp_admin.status_code == 200
    data = resp_admin.json()
    assert data["curriculum_code"] == f"IMPORT-TEST-{uid}"
    assert data["curriculum_created"] == 1
    assert data["topics_created"] == 1
    assert data["skills_created"] == 1


@pytest.mark.asyncio
async def test_curricula_filters_and_not_found(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
    seeded_graph_data: Curriculum,
) -> None:
    """Test curriculum listing with grade/board query params and 404 branches."""
    _user, _token, headers = student_auth
    curr = seeded_graph_data

    # Query with filters
    resp_filtered = await client.get(
        f"/api/v1/curricula?grade={curr.grade}&board={curr.board}", headers=headers
    )
    assert resp_filtered.status_code == 200
    items = resp_filtered.json()
    assert any(c["code"] == curr.code for c in items)

    # 404 on get curriculum by non-existent code
    resp_curr_404 = await client.get("/api/v1/curricula/NON-EXISTENT-CODE-123", headers=headers)
    assert resp_curr_404.status_code == 404

    # 404 on get topics by non-existent code
    resp_topics_404 = await client.get(
        "/api/v1/curricula/NON-EXISTENT-CODE-123/topics", headers=headers
    )
    assert resp_topics_404.status_code == 404


@pytest.mark.asyncio
async def test_curriculum_code_alias_resolution(
    db_session: AsyncSession,
) -> None:
    """Verify alias normalization resolves short and alternate codes."""
    from app.core.curriculum import normalize_curriculum_code
    from app.repositories.curriculum_repo import CurriculumRepository

    assert normalize_curriculum_code("NCERT-SCI-C8") == "NCERT-SCIE-C8"
    assert normalize_curriculum_code("NCERT-SST-C9") == "NCERT-SOCI-C9"
    assert normalize_curriculum_code("NCERT-ENG-C7") == "NCERT-ENGL-C7"
    assert normalize_curriculum_code("NCERT-HIN-C6") == "NCERT-HIND-C6"
    assert normalize_curriculum_code("NCERT-MATH-C8") == "NCERT-MATH-C8"

    curr = Curriculum(
        code="NCERT-SCIE-C8",
        board="NCERT",
        grade=8,
        subject="science",
        version="2024-2025",
    )
    db_session.add(curr)
    await db_session.flush()

    repo = CurriculumRepository(db_session)
    fetched = await repo.get_by_code("NCERT-SCI-C8")
    assert fetched is not None
    assert fetched.code == "NCERT-SCIE-C8"
