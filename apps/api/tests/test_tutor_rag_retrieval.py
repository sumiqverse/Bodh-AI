"""Integration tests for AI Tutor RAG pipeline.

Tests vector chunk ingestion and zero-guessing fallback.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.assessment import Question, QuestionTranslation
from app.models.curriculum import Curriculum, Skill, Topic
from app.models.tutor import TutorInteractionLog
from app.repositories.tutor_repo import TutorRepository
from app.schemas.tutor import TutorQueryRequest
from app.services.tutor_ingestion import TutorIngestionService
from app.services.tutor_provider import MockLLMProvider
from app.services.tutor_service import AITutorService


@pytest.mark.asyncio
async def test_rag_ingest_only_published_teacher_approved(db_session: AsyncSession) -> None:
    """Verify that ONLY published questions without review flags enter the vector store."""
    settings = get_settings()

    # 1. Create Curriculum, Topic, and Skill
    curriculum = Curriculum(
        id=uuid.uuid4(),
        code="CURR_TEST_RAG",
        board="NCERT",
        grade=8,
        subject="Mathematics",
        version="v1",
    )
    db_session.add(curriculum)
    await db_session.flush()

    topic = Topic(
        id=uuid.uuid4(),
        curriculum_id=curriculum.id,
        code="TOPIC_INTEGERS",
        name="Integers Unit",
        sequence_order=1,
    )
    db_session.add(topic)
    await db_session.flush()

    skill = Skill(
        id=uuid.uuid4(),
        topic_id=topic.id,
        code="MATH_INT_OP",
        name="Integer Operations",
        description="Comprehensive rules for adding and multiplying negative integers.",
        difficulty=0.4,
        blooms_level="understand",
    )
    db_session.add(skill)
    await db_session.flush()

    # 2. Add Published question (approved by teacher)
    q_published = Question(
        id=uuid.uuid4(),
        skill_id=skill.id,
        code="Q_PUB_1",
        question_type="short_text",
        difficulty=2,
        status="published",
        needs_teacher_review=False,
        version=1,
        default_language="en",
        is_active=True,
    )
    db_session.add(q_published)
    await db_session.flush()

    tr_published = QuestionTranslation(
        id=uuid.uuid4(),
        question_id=q_published.id,
        language="en",
        prompt="What is (-4) + (-6)?",
        verified_answer="-10",
        worked_solution="Add 4 and 6 to get 10, keep negative sign: -10.",
        explanation="When adding two negative numbers, the result is negative.",
        hints=["Check signs", "Add numbers", "Keep negative sign"],
    )
    db_session.add(tr_published)

    # 3. Add Draft question (should NOT be ingested)
    q_draft = Question(
        id=uuid.uuid4(),
        skill_id=skill.id,
        code="Q_DRAFT_1",
        question_type="short_text",
        difficulty=2,
        status="draft",
        needs_teacher_review=True,
        version=1,
        default_language="en",
        is_active=True,
    )
    db_session.add(q_draft)
    await db_session.flush()

    tr_draft = QuestionTranslation(
        id=uuid.uuid4(),
        question_id=q_draft.id,
        language="en",
        prompt="Draft question prompt",
        verified_answer="Draft",
        worked_solution="Draft unverified solution",
        explanation="Draft unreviewed explanation",
        hints=["Draft hint 1"],
    )
    db_session.add(tr_draft)
    await db_session.commit()

    # 4. Run ingestion pipeline
    ingest_service = TutorIngestionService(db_session, settings, provider=MockLLMProvider())
    response = await ingest_service.ingest_published_curriculum(
        curriculum_id=curriculum.id,
        force_reindex=True,
    )

    assert response.total_published_questions_indexed == 1
    assert response.total_chunks_created > 0

    repo = TutorRepository(db_session)
    chunks_scored = await repo.search_similar_chunks(
        skill_id=skill.id,
        query_vector=await MockLLMProvider().get_embedding(
            "How do I add negative integers (-4) + (-6)?"
        ),
        language="en",
        min_threshold=0.50,
    )

    # Ensure draft solution never exists in chunks
    chunk_contents = [c[0].content for c in chunks_scored]
    assert not any("Draft unverified solution" in c for c in chunk_contents)
    assert any("Add 4 and 6 to get 10" in c for c in chunk_contents)


@pytest.mark.asyncio
async def test_zero_guessing_static_fallback_when_ungrounded(db_session: AsyncSession) -> None:
    """Ensure tutor NEVER guesses: if ungrounded, show verified static worked solution."""
    settings = get_settings()

    # Setup Skill and Question with static worked solution
    curriculum = Curriculum(
        id=uuid.uuid4(),
        code="CURR_FALLBACK",
        board="NCERT",
        grade=7,
        subject="Mathematics",
        version="v1",
    )
    db_session.add(curriculum)
    await db_session.flush()

    topic = Topic(
        id=uuid.uuid4(),
        curriculum_id=curriculum.id,
        code="TOPIC_FALLBACK",
        name="Fallback Unit",
        sequence_order=1,
    )
    db_session.add(topic)
    await db_session.flush()

    skill = Skill(
        id=uuid.uuid4(),
        topic_id=topic.id,
        code="MATH_FRAC_BASE",
        name="Fraction Basics",
        description="Proper and improper fractions.",
        difficulty=0.3,
        blooms_level="remember",
    )
    db_session.add(skill)
    await db_session.flush()

    q = Question(
        id=uuid.uuid4(),
        skill_id=skill.id,
        code="Q_FRAC_BASE",
        question_type="short_text",
        difficulty=2,
        status="published",
        needs_teacher_review=False,
        version=1,
        default_language="en",
        is_active=True,
    )
    db_session.add(q)
    await db_session.flush()

    static_sol = "Verified Step-by-Step: 1/2 of 8 = 4 slices."
    tr = QuestionTranslation(
        id=uuid.uuid4(),
        question_id=q.id,
        language="en",
        prompt="What is 1/2 of 8?",
        verified_answer="4",
        worked_solution=static_sol,
        explanation="Multiply numerator by 8 and divide by denominator 2.",
        hints=["Divide 8 by 2"],
    )
    db_session.add(tr)
    await db_session.commit()

    # Ingest published content
    ingest_service = TutorIngestionService(db_session, settings, provider=MockLLMProvider())
    await ingest_service.ingest_published_curriculum(force_reindex=True)

    tutor_service = AITutorService(db_session, settings, provider=MockLLMProvider())

    # Completely ungrounded query unrelated to fractions (low similarity < 0.70)
    ungrounded_request = TutorQueryRequest(
        skill_id=skill.id,
        student_query="What is the quantum wave function equation for an electron?",
        language="en",
        is_test_mode=False,
    )
    student_id = uuid.uuid4()
    response = await tutor_service.answer_student_query(student_id, ungrounded_request)

    # Must refuse to guess and return verified static solution
    assert response.can_help is False
    assert response.static_fallback_used is True
    assert response.refusal_reason == "low_similarity"
    assert response.static_worked_solution == static_sol
    assert (
        "cannot help" in response.explanation.lower()
        or "rather than guessing" in response.explanation.lower()
    )


@pytest.mark.asyncio
async def test_log_retention_pruning(db_session: AsyncSession) -> None:
    """Ensure DPDP privacy storage limitation: logs older than retention period are pruned."""
    repo = TutorRepository(db_session)
    student_id = uuid.uuid4()
    skill_id = uuid.uuid4()

    # Create old log (100 days ago)
    old_log = TutorInteractionLog(
        id=uuid.uuid4(),
        student_id=student_id,
        skill_id=skill_id,
        query_scrubbed="Old scrubbed query",
        response_text="Old response",
        tokens_used=50,
        cost_usd=0.001,
        retrieval_similarity=0.85,
        created_at=datetime.now(UTC) - timedelta(days=100),
    )
    # Create recent log (5 days ago)
    recent_log = TutorInteractionLog(
        id=uuid.uuid4(),
        student_id=student_id,
        skill_id=skill_id,
        query_scrubbed="Recent query",
        response_text="Recent response",
        tokens_used=50,
        cost_usd=0.001,
        retrieval_similarity=0.85,
        created_at=datetime.now(UTC) - timedelta(days=5),
    )
    db_session.add_all([old_log, recent_log])
    await db_session.commit()

    # Prune logs older than 90 days
    pruned_count = await repo.prune_logs_older_than(days=90)
    assert pruned_count >= 1
