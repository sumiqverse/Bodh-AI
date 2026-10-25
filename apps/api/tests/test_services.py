"""Unit tests for services: MasteryService (BKT), AttemptService, and SyncService."""

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.models.curriculum import Curriculum, Topic
from app.repositories.base import BaseRepository
from app.repositories.mastery_repo import MasteryRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.skill_repo import SkillRepository
from app.schemas.assessment import AttemptSubmitRequest
from app.schemas.sync import SyncBatchRequest, SyncItemRequest
from app.services.attempt_service import AttemptService
from app.services.mastery_service import MasteryService
from app.services.sync_service import SyncService
from tests.factories import (
    CurriculumFactory,
    QuestionFactory,
    SkillFactory,
    TopicFactory,
)


@pytest.mark.asyncio
async def test_bkt_formula_accuracy(db_session: AsyncSession) -> None:
    """Test Bayesian Knowledge Tracing transition calculations."""
    mastery_service = MasteryService(db_session)

    # Case 1: Initial prior 0.3, student answers correctly
    # Posterior should be significantly higher than 0.3
    p_updated = mastery_service.calculate_next_mastery(
        current_p=0.3,
        is_correct=True,
        p_transit=0.1,
        p_slip=0.1,
        p_guess=0.2,
    )
    assert p_updated > 0.3
    # Check bounds
    assert 0.01 <= p_updated <= 0.99

    # Case 2: Prior 0.8, student answers incorrectly
    # Posterior should decrease
    p_decreased = mastery_service.calculate_next_mastery(
        current_p=0.8,
        is_correct=False,
        p_transit=0.1,
        p_slip=0.1,
        p_guess=0.2,
    )
    assert p_decreased < 0.8

    # Case 3: Extreme high prior should remain clamped <= 0.99
    p_high = mastery_service.calculate_next_mastery(
        current_p=0.99,
        is_correct=True,
    )
    assert p_high <= 0.99

    # Case 4: Extreme low prior should remain clamped >= 0.01
    p_low = mastery_service.calculate_next_mastery(
        current_p=0.01,
        is_correct=False,
    )
    assert p_low >= 0.01


@pytest.mark.asyncio
async def test_attempt_submission_and_idempotency(db_session: AsyncSession) -> None:
    """Test submitting an attempt evaluates correctness, updates mastery, and is idempotent."""
    curr_repo = BaseRepository[Curriculum](Curriculum, db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)
    skill_repo = SkillRepository(db_session)
    question_repo = QuestionRepository(db_session)

    curriculum = await curr_repo.create(CurriculumFactory.build())
    topic = await topic_repo.create(TopicFactory.build(curriculum_id=curriculum.id))
    skill = await skill_repo.create(SkillFactory.build(topic_id=topic.id))

    question = await question_repo.create(QuestionFactory.build(skill_id=skill.id))
    await question_repo.add_translation(
        question_id=question.id,
        language="en",
        prompt="What is 3/7 + 2/7?",
        options=[
            {"id": "A", "text": "5/7", "is_correct": True},
            {"id": "B", "text": "5/14", "is_correct": False},
        ],
        explanation="Add numerators: 3+2=5.",
    )

    attempt_service = AttemptService(db_session)
    student_id = uuid.uuid4()
    idempotency_key = f"test_submission_{uuid.uuid4()}"

    # 1. Submit correct answer
    req = AttemptSubmitRequest(
        question_id=question.id,
        skill_id=skill.id,
        selected_answer="A",
        idempotency_key=idempotency_key,
        time_spent_ms=5000,
        client_timestamp=datetime.now(UTC),
    )

    result = await attempt_service.submit_attempt(student_id, req)
    assert result.is_correct is True
    assert result.is_duplicate is False

    # Check mastery was created
    mastery_repo = MasteryRepository(db_session)
    mastery = await mastery_repo.get_by_student_and_skill(student_id, skill.id)
    assert mastery is not None
    assert mastery.attempts_count == 1
    assert mastery.correct_count == 1

    # 2. Resubmit with identical idempotency key -> Must return duplicate
    result_dup = await attempt_service.submit_attempt(student_id, req)
    assert result_dup.attempt_id == result.attempt_id
    assert result_dup.is_duplicate is True

    mastery_after = await mastery_repo.get_by_student_and_skill(student_id, skill.id)
    assert mastery_after is not None
    assert mastery_after.attempts_count == 1  # Not incremented again


@pytest.mark.asyncio
async def test_attempt_submission_non_existent_question(db_session: AsyncSession) -> None:
    """Test submitting an attempt for a missing question raises NotFoundError."""
    attempt_service = AttemptService(db_session)

    req = AttemptSubmitRequest(
        question_id=uuid.uuid4(),
        skill_id=uuid.uuid4(),
        selected_answer="A",
        idempotency_key="missing_q_test_123",
        time_spent_ms=1000,
        client_timestamp=datetime.now(UTC),
    )

    with pytest.raises(NotFoundError):
        await attempt_service.submit_attempt(uuid.uuid4(), req)


@pytest.mark.asyncio
async def test_sync_service_process_batch(db_session: AsyncSession) -> None:
    """Test SyncService processing batch of offline events idempotently."""
    curr_repo = BaseRepository[Curriculum](Curriculum, db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)
    skill_repo = SkillRepository(db_session)
    question_repo = QuestionRepository(db_session)

    curriculum = await curr_repo.create(CurriculumFactory.build())
    topic = await topic_repo.create(TopicFactory.build(curriculum_id=curriculum.id))
    skill = await skill_repo.create(SkillFactory.build(topic_id=topic.id))
    question = await question_repo.create(QuestionFactory.build(skill_id=skill.id))
    await question_repo.add_translation(
        question_id=question.id,
        language="en",
        prompt="What is 2+2?",
        options=[{"id": "A", "text": "4", "is_correct": True}],
        explanation="2+2=4.",
    )

    student_id = uuid.uuid4()
    sync_service = SyncService(db_session)

    client_event_id = f"evt_{uuid.uuid4()}"
    batch_req = SyncBatchRequest(
        events=[
            SyncItemRequest(
                client_event_id=client_event_id,
                event_type="attempt_submission",
                payload={
                    "question_id": str(question.id),
                    "skill_id": str(skill.id),
                    "selected_answer": "A",
                    "idempotency_key": f"sync_idem_{uuid.uuid4()}",
                    "time_spent_ms": 3000,
                    "client_timestamp": datetime.now(UTC).isoformat(),
                },
                timestamp=datetime.now(UTC),
            ),
        ],
    )

    response = await sync_service.process_batch(student_id, batch_req)
    assert response.processed == 1
    assert response.failed == 0
    assert len(response.results) == 1
    assert response.results[0].status == "success"

    # Resubmitting same batch should mark as duplicate
    response_dup = await sync_service.process_batch(student_id, batch_req)
    assert response_dup.results[0].status == "duplicate"
