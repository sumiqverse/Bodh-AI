"""Unit and integration tests for AI Tutor multilingual translation.

Tests NCERT glossary lookup, terminology alignment, and teacher review flagging.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Question, QuestionTranslation
from app.models.curriculum import Curriculum, GlossaryTerm, Skill, Topic
from app.services.tutor_translation import (
    align_terminology_with_glossary,
    lookup_glossary_terms,
    mark_for_teacher_review,
)


@pytest.mark.asyncio
async def test_glossary_lookup_and_alignment(db_session: AsyncSession) -> None:
    """Ensure English <-> Hindi explanations use the glossary table for canonical terminology."""
    curriculum = Curriculum(
        id=uuid.uuid4(),
        code="CURR_GLOSSARY_TEST",
        board="NCERT",
        grade=7,
        subject="Mathematics",
        version="v1",
    )
    db_session.add(curriculum)
    await db_session.flush()

    # Seed glossary terms
    term1 = GlossaryTerm(
        id=uuid.uuid4(),
        curriculum_id=curriculum.id,
        term_en="rational number",
        term_hi="परिमेय संख्या",
        definition_en=(
            "A number that can be expressed as a quotient or fraction p/q of two integers."
        ),
        definition_hi="एक संख्या जिसे दो पूर्णांकों के भागफल या भिन्न p/q के रूप में व्यक्त किया जा सकता है।",
        category="math",
    )
    term2 = GlossaryTerm(
        id=uuid.uuid4(),
        curriculum_id=curriculum.id,
        term_en="integer",
        term_hi="पूर्णांक",
        definition_en="A whole number that can be positive, negative, or zero.",
        definition_hi="एक पूर्ण संख्या जो धनात्मक, ऋणात्मक या शून्य हो सकती है।",
        category="math",
    )
    db_session.add_all([term1, term2])
    await db_session.commit()

    # Query with English terms
    terms_found = await lookup_glossary_terms(
        db_session, "Can you explain rational number and integer operations?"
    )
    terms_dict = {t["term_en"]: t["term_hi"] for t in terms_found}
    assert "rational number" in terms_dict
    assert terms_dict["rational number"] == "परिमेय संख्या"
    assert "integer" in terms_dict
    assert terms_dict["integer"] == "पूर्णांक"

    # Query with Hindi terms
    terms_hi_found = await lookup_glossary_terms(db_session, "परिमेय संख्या का क्या अर्थ है?")
    terms_hi_dict = {t["term_en"]: t["term_hi"] for t in terms_hi_found}
    assert "rational number" in terms_hi_dict

    # Test alignment in target Hindi
    english_raw = "Every integer is also a rational number."
    aligned_hi = align_terminology_with_glossary(english_raw, terms_found, target_language="hi")
    assert "परिमेय संख्या" in aligned_hi
    assert "पूर्णांक" in aligned_hi


@pytest.mark.asyncio
async def test_mark_machine_translated_content_needs_review(db_session: AsyncSession) -> None:
    """Ensure machine-translated content is flagged with needs_teacher_review = True."""
    curriculum = Curriculum(
        id=uuid.uuid4(),
        code="CURR_TRANS_FLAG",
        board="NCERT",
        grade=8,
        subject="Science",
        version="v1",
    )
    db_session.add(curriculum)
    await db_session.flush()

    topic = Topic(
        id=uuid.uuid4(),
        curriculum_id=curriculum.id,
        code="TOPIC_CHEM",
        name="Chemistry Unit",
        sequence_order=1,
    )
    db_session.add(topic)
    await db_session.flush()

    skill = Skill(
        id=uuid.uuid4(),
        topic_id=topic.id,
        code="CHEM_ACID_BASE",
        name="Acids and Bases",
        description="Acid base neutralization.",
        difficulty=0.5,
        blooms_level="understand",
    )
    db_session.add(skill)
    await db_session.flush()

    # Question created as published initially
    q = Question(
        id=uuid.uuid4(),
        skill_id=skill.id,
        code="Q_MT_1",
        question_type="short_text",
        difficulty=3,
        status="published",
        needs_teacher_review=False,
        version=1,
        default_language="en",
        is_active=True,
    )
    db_session.add(q)
    await db_session.flush()

    tr_en = QuestionTranslation(
        id=uuid.uuid4(),
        question_id=q.id,
        language="en",
        prompt="Explain neutralization",
        verified_answer="Salt and water",
        worked_solution="Acid + Base -> Salt + Water",
        explanation="Neutralization produces neutral pH",
        hints=["Consider pH"],
    )
    db_session.add(tr_en)
    await db_session.commit()

    # Mark as having new machine translation that needs teacher review
    await mark_for_teacher_review(db_session, q.id)
    await db_session.refresh(q)

    assert q.needs_teacher_review is True
    assert q.status == "reviewed" or q.status == "draft" or q.needs_teacher_review is True
