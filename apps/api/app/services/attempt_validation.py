"""Validation shared by online and offline attempt submission paths."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.curriculum import resolve_curriculum_code
from app.core.errors import AuthorizationError, ConflictError
from app.models.assessment import Question
from app.models.curriculum import Curriculum, Skill, Topic
from app.models.organization import Enrollment


async def validate_attempt_context(
    session: AsyncSession,
    student_id: uuid.UUID,
    class_id: uuid.UUID | None,
    question: Question,
    skill_id: uuid.UUID,
) -> None:
    if question.skill_id != skill_id:
        raise ConflictError("The question does not belong to the supplied skill.")
    if question.class_id is not None and question.class_id != class_id:
        raise AuthorizationError("This question belongs to a different classroom.")
    if class_id is None:
        return
    result = await session.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.school_class))
        .where(
            Enrollment.class_id == class_id,
            Enrollment.student_id == student_id,
            Enrollment.status == "active",
        )
    )
    enrollment = result.scalar_one_or_none()
    if enrollment is None or enrollment.school_class is None:
        raise AuthorizationError("An active classroom enrollment is required.")
    school_class = enrollment.school_class
    expected = resolve_curriculum_code(
        school_class.grade, school_class.subject or school_class.name
    )
    code_result = await session.execute(
        select(Curriculum.code)
        .join(Topic, Topic.curriculum_id == Curriculum.id)
        .join(Skill, Skill.topic_id == Topic.id)
        .where(Skill.id == skill_id)
    )
    if code_result.scalar_one_or_none() != expected:
        raise ConflictError("The question does not belong to this classroom's curriculum.")
