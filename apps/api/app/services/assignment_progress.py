"""Update assignment status from classroom attempts and mastery."""

import contextlib
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Attempt, Mastery
from app.models.curriculum import Skill
from app.models.teacher import Assignment, AssignmentStudent


async def update_assignment_progress(
    session: AsyncSession, student_id: uuid.UUID, class_id: uuid.UUID
) -> None:
    await session.flush()
    rows = await session.execute(
        select(Assignment, AssignmentStudent)
        .join(AssignmentStudent, AssignmentStudent.assignment_id == Assignment.id)
        .where(
            Assignment.class_id == class_id,
            Assignment.status == "active",
            AssignmentStudent.student_id == student_id,
            AssignmentStudent.status != "completed",
        )
    )
    for assignment, link in rows.all():
        wanted = set(assignment.skill_ids)
        uuid_values = []
        for value in wanted:
            with contextlib.suppress(ValueError):
                uuid_values.append(uuid.UUID(value))
        skills_result = await session.execute(
            select(Skill).where(
                Skill.is_deleted == False,  # noqa: E712
                or_(Skill.id.in_(uuid_values), Skill.code.in_(wanted)),
            )
        )
        skills = list(skills_result.scalars().all())
        if len(skills) != len(wanted) or not skills:
            continue
        attempts_result = await session.execute(
            select(Attempt.skill_id, func.count(Attempt.id))
            .where(
                Attempt.student_id == student_id,
                Attempt.class_id == class_id,
                Attempt.skill_id.in_([skill.id for skill in skills]),
                Attempt.created_at >= assignment.created_at,
            )
            .group_by(Attempt.skill_id)
        )
        counts = dict(attempts_result.all())
        if counts and link.status == "assigned":
            link.status = "in_progress"
        mastery_result = await session.execute(
            select(Mastery.skill_id, Mastery.p_mastery).where(
                Mastery.student_id == student_id,
                Mastery.class_id == class_id,
                Mastery.skill_id.in_([skill.id for skill in skills]),
            )
        )
        mastery = dict(mastery_result.all())
        if all(
            counts.get(skill.id, 0) >= 3 and mastery.get(skill.id, 0) >= 0.95 for skill in skills
        ):
            link.status = "completed"
            link.completed_at = datetime.now(UTC)
    await session.flush()
