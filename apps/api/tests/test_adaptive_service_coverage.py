"""Unit tests expanding test coverage for AdaptiveService, Ranker, and EM Fitting."""

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConsentRequiredError, NotFoundError
from app.engine.em_fitting import (
    fit_bkt_em,
    load_pybkt_csv_format,
)
from app.engine.models import (
    RankerWeights,
    SkillState,
)
from app.engine.ranker import CandidateItem, RecommendationRanker
from app.models.auth import User
from app.models.curriculum import Curriculum, Topic
from app.repositories.base import BaseRepository
from app.repositories.consent_repo import ConsentRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.skill_repo import SkillRepository
from app.schemas.assessment import (
    AttemptSubmitRequest,
    DiagnosticProgressRequest,
)
from app.services.adaptive_service import AdaptiveService
from tests.factories import (
    CurriculumFactory,
    QuestionFactory,
    SkillFactory,
    TopicFactory,
)


@pytest.mark.asyncio
async def test_adaptive_service_consent_error(
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Ensure Attempt submission without parental consent raises ConsentRequiredError."""
    student, _, _ = student_auth
    service = AdaptiveService(db_session)
    dummy_req = AttemptSubmitRequest(
        question_id=uuid.uuid4(),
        skill_id=uuid.uuid4(),
        selected_answer="A",
        idempotency_key=f"no_consent_{uuid.uuid4()}",
        time_spent_ms=5000,
        client_timestamp=datetime.now(UTC),
    )

    with pytest.raises(ConsentRequiredError, match="DPDP Act 2023"):
        await service.submit_attempt(student.id, dummy_req)


@pytest.mark.asyncio
async def test_adaptive_service_question_not_found(
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Ensure Attempt submission for non-existent question raises NotFoundError."""
    student, _, _ = student_auth
    consent_repo = ConsentRepository(db_session)
    await consent_repo.grant_consent(student_id=student.id, scope="practice", version="2024.1")

    service = AdaptiveService(db_session)
    dummy_req = AttemptSubmitRequest(
        question_id=uuid.uuid4(),
        skill_id=uuid.uuid4(),
        selected_answer="A",
        idempotency_key=f"missing_q_{uuid.uuid4()}",
        time_spent_ms=5000,
        client_timestamp=datetime.now(UTC),
    )

    with pytest.raises(NotFoundError, match="Question"):
        await service.submit_attempt(student.id, dummy_req)


@pytest.mark.asyncio
async def test_adaptive_service_verified_answer_text_question(
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Ensure numeric/text question with verified_answer is correctly evaluated."""
    student, _, _ = student_auth
    consent_repo = ConsentRepository(db_session)
    await consent_repo.grant_consent(student_id=student.id, scope="practice", version="2024.1")

    curr_repo = BaseRepository[Curriculum](Curriculum, db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)
    skill_repo = SkillRepository(db_session)
    question_repo = QuestionRepository(db_session)

    sfx = uuid.uuid4().hex[:6]
    curr = await curr_repo.create(CurriculumFactory.build(code=f"CURR-{sfx}"))
    top = await topic_repo.create(TopicFactory.build(curriculum_id=curr.id, code=f"TOP-{sfx}"))
    sk = await skill_repo.create(SkillFactory.build(topic_id=top.id, code=f"SK-{sfx}"))

    q = await question_repo.create(
        QuestionFactory.build(
            skill_id=sk.id,
            code=f"Q-NUM-{sfx}",
            question_type="numeric",
            difficulty=3,
        )
    )
    await question_repo.add_translation(
        question_id=q.id,
        language="en",
        prompt="What is 15 + 25?",
        verified_answer="40",
        worked_solution="15 + 25 = 40",
    )

    service = AdaptiveService(db_session)
    req = AttemptSubmitRequest(
        question_id=q.id,
        skill_id=sk.id,
        selected_answer="40",
        idempotency_key=f"num_{uuid.uuid4()}",
        time_spent_ms=6000,
        client_timestamp=datetime.now(UTC),
    )

    resp = await service.submit_attempt(student.id, req)
    assert resp.is_correct is True
    assert resp.is_duplicate is False
    assert "worked_solution" in resp.explanation or "40" in resp.explanation


@pytest.mark.asyncio
async def test_adaptive_service_progress_unknown_session(
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Ensure advancing an unknown diagnostic session raises NotFoundError."""
    student, _, _ = student_auth
    service = AdaptiveService(db_session)
    req = DiagnosticProgressRequest(
        session_id="unknown-session-123",
        question_id=str(uuid.uuid4()),
        selected_answer="A",
        time_spent_ms=4000,
        hint_level=0,
    )
    with pytest.raises(NotFoundError, match="DiagnosticSession"):
        await service.progress_diagnostic(student.id, req)


def test_ranker_scoring_edge_cases() -> None:
    """Exercise RecommendationRanker compute_item_score across diverse features."""
    ranker = RecommendationRanker(RankerWeights())

    item = CandidateItem(
        question_id="Q-TEST",
        skill_id="SKILL-1",
        skill_code="MATH-SKILL-1",
        difficulty=3,
        curriculum_order=10,
    )

    # 1. Without student state (p_mastery defaults to p_init)
    score, breakdown = ranker.compute_item_score(
        item=item,
        skill_state=None,
        is_prereq_gap=False,
        recent_history=[],
        max_curriculum_order=100,
    )
    assert 0.0 <= score <= 1.0
    assert "gap_priority" in breakdown
    assert "difficulty_fit" in breakdown

    # 2. As a root-cause gap
    _score_gap, breakdown_gap = ranker.compute_item_score(
        item=item,
        skill_state=None,
        is_prereq_gap=True,
        recent_history=["SKILL-1"],
        max_curriculum_order=100,
    )
    assert breakdown_gap["gap_priority"] == 1.0
    assert breakdown_gap["recency_penalty"] > 0.0

    # 3. Test gate item
    gate_state = SkillState(
        skill_id="SKILL-1",
        p_mastery=0.96,
        observations_count=4,
        correct_count=4,
        hint_free_correct_count=2,
    )
    ranked = ranker.rank_items(
        candidates=[item],
        skill_states={"SKILL-1": gate_state},
        attempted_question_ids=set(),
    )
    assert len(ranked) == 1
    assert ranked[0].is_test_gate is True
    assert "Test Gate verification" in ranked[0].rationale


def test_em_fitting_pybkt_format() -> None:
    """Test loading and fitting BKT models from simulated pyBKT CSV rows."""
    lines = [
        "student,skill,correct",
        "user1,skillA,1",
        "user1,skillA,1",
        "user1,skillA,1",
        "user2,skillA,0",
        "user2,skillA,1",
        "user2,skillA,1",
        "user3,skillA,0",
        "user3,skillA,0",
        "user3,skillA,1",
    ]
    seqs = load_pybkt_csv_format(lines, skill_filter="skillA")
    assert len(seqs) == 3

    fitted = fit_bkt_em(seqs, max_iter=20, tol=1e-4)
    assert 0.0 <= fitted.p_init <= 1.0
    assert 0.0 <= fitted.p_transit <= 1.0
    assert 0.0 <= fitted.p_guess <= 1.0
    assert 0.0 <= fitted.p_slip <= 1.0
    assert fitted.p_guess + fitted.p_slip < 1.0
