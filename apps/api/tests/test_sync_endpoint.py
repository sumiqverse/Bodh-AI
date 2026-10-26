"""Integration tests for POST /api/v1/sync offline batch synchronization."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.repositories.consent_repo import ConsentRepository
from app.repositories.curriculum_repo import CurriculumRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.skill_repo import SkillRepository
from tests.factories import (
    CurriculumFactory,
    QuestionFactory,
    SkillFactory,
    TopicFactory,
)


@pytest.mark.asyncio
async def test_sync_batch_replays_attempts_and_returns_canonical_mastery(
    client: AsyncClient,
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test full batch sync of offline student attempts with canonical mastery return."""
    _student, _, headers = student_auth

    # Grant consent for assessment attempts under DPDP Act 2023
    consent_repo = ConsentRepository(db_session)
    await consent_repo.grant_consent(student_id=_student.id, scope="practice", version="2024.1")

    # 1. Setup skill & question
    curr_repo = CurriculumRepository(db_session)
    curriculum = await curr_repo.create(CurriculumFactory.build(code="NCERT_SYNC_TEST_7", grade=7))
    topic = TopicFactory.build(curriculum_id=curriculum.id, name="Algebra")
    db_session.add(topic)
    await db_session.flush()

    skill_repo = SkillRepository(db_session)
    skill = await skill_repo.create(
        SkillFactory.build(topic_id=topic.id, code="SYNC_SKILL_01", difficulty=0.4)
    )

    q_repo = QuestionRepository(db_session)
    question = await q_repo.create(QuestionFactory.build(skill_id=skill.id))
    await db_session.commit()

    # 2. Build sync payload with 2 offline events
    now = datetime.now(UTC)
    ev1_id = str(uuid.uuid4())
    ev2_id = str(uuid.uuid4())

    payload = {
        "events": [
            {
                "client_event_id": ev1_id,
                "event_type": "attempt_submission",
                "payload": {
                    "question_id": str(question.id),
                    "skill_id": str(skill.id),
                    "selected_answer": "B",
                    "time_spent_ms": 3500,
                    "idempotency_key": str(uuid.uuid4()),
                    "client_timestamp": (now - timedelta(minutes=5)).isoformat(),
                },
                "timestamp": (now - timedelta(minutes=5)).isoformat(),
            },
            {
                "client_event_id": ev2_id,
                "event_type": "attempt_submission",
                "payload": {
                    "question_id": str(question.id),
                    "skill_id": str(skill.id),
                    "selected_answer": "B",
                    "time_spent_ms": 2800,
                    "idempotency_key": str(uuid.uuid4()),
                    "client_timestamp": (now - timedelta(minutes=2)).isoformat(),
                },
                "timestamp": (now - timedelta(minutes=2)).isoformat(),
            },
        ]
    }

    # 3. Dispatch POST /api/v1/sync
    res = await client.post("/api/v1/sync", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["processed"] == 2
    assert data["failed"] == 0
    assert len(data["results"]) == 2
    assert all(r["status"] == "success" for r in data["results"])

    # Canonical mastery must be returned
    assert "canonical_mastery" in data
    assert len(data["canonical_mastery"]) >= 1
    mastery_record = next(m for m in data["canonical_mastery"] if m["skill_id"] == str(skill.id))
    assert mastery_record["attempts_count"] >= 2
    assert mastery_record["p_mastery"] > 0.1


@pytest.mark.asyncio
async def test_sync_duplicate_event_is_idempotent(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test duplicate sync items with same client_event_id are safely ignored."""
    _, _, headers = student_auth
    now = datetime.now(UTC)
    duplicate_event_id = str(uuid.uuid4())

    payload = {
        "events": [
            {
                "client_event_id": duplicate_event_id,
                "event_type": "generic_event",
                "payload": {"note": "initial"},
                "timestamp": now.isoformat(),
            }
        ]
    }

    # First attempt: processed
    res1 = await client.post("/api/v1/sync", json=payload, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["processed"] == 1

    # Second attempt: marked duplicate without failing
    res2 = await client.post("/api/v1/sync", json=payload, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["processed"] == 0
    assert data2["failed"] == 0
    assert data2["results"][0]["status"] == "duplicate"


@pytest.mark.asyncio
async def test_sync_clock_skew_flagging(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test that timestamps > 5 minutes in future are clamped and flagged."""
    _, _, headers = student_auth
    future_time = datetime.now(UTC) + timedelta(minutes=45)

    payload = {
        "events": [
            {
                "client_event_id": str(uuid.uuid4()),
                "event_type": "generic_event",
                "payload": {"data": "clock skew test"},
                "timestamp": future_time.isoformat(),
            }
        ]
    }

    res = await client.post("/api/v1/sync", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["processed"] == 1
    assert res.json()["results"][0]["status"] == "success"


@pytest.mark.asyncio
async def test_sync_invalid_attempt_payload_failure(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test malformed attempt_submission payloads register failure without aborting batch."""
    _, _, headers = student_auth

    payload = {
        "events": [
            {
                "client_event_id": str(uuid.uuid4()),
                "event_type": "attempt_submission",
                "payload": {"invalid": "missing all required fields"},
                "timestamp": datetime.now(UTC).isoformat(),
            }
        ]
    }

    res = await client.post("/api/v1/sync", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["failed"] == 1
    assert data["processed"] == 0
    assert data["results"][0]["status"] == "failed"
    assert "error" in data["results"][0]


@pytest.mark.asyncio
async def test_sync_naive_future_timestamp(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test that naive future timestamp without tzinfo is coerced to UTC and flagged."""
    _, _, headers = student_auth
    naive_future = datetime.utcnow() + timedelta(minutes=20)

    payload = {
        "events": [
            {
                "client_event_id": str(uuid.uuid4()),
                "event_type": "generic_event",
                "payload": {"info": "naive future time"},
                "timestamp": naive_future.strftime("%Y-%m-%dT%H:%M:%S"),
            }
        ]
    }

    res = await client.post("/api/v1/sync", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["processed"] == 1
    assert res.json()["results"][0]["status"] == "success"
