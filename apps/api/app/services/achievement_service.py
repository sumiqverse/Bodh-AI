"""Award classroom achievements from recorded mastery and attempts."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import Achievement
from app.models.assessment import Attempt, Mastery
from app.models.curriculum import Skill, Topic
from app.models.organization import Enrollment


async def award_progress(
    session: AsyncSession, student_id: uuid.UUID, class_id: uuid.UUID, skill_id: uuid.UUID
) -> None:
    # Serialize awards for a student/class so simultaneous requests cannot double-award.
    enrollment = await session.execute(
        select(Enrollment)
        .where(Enrollment.student_id == student_id, Enrollment.class_id == class_id)
        .with_for_update()
    )
    if enrollment.scalar_one_or_none() is None:
        return
    await session.flush()
    skill = await session.get(Skill, skill_id)
    if skill is None or skill.is_deleted:
        return
    topic = await session.get(Topic, skill.topic_id)
    if topic is None or topic.is_deleted:
        return
    result = await session.execute(
        select(Skill.id, Skill.name, Mastery.p_mastery, func.count(Attempt.id))
        .outerjoin(
            Mastery,
            (Mastery.skill_id == Skill.id)
            & (Mastery.student_id == student_id)
            & (Mastery.class_id == class_id),
        )
        .outerjoin(
            Attempt,
            (Attempt.skill_id == Skill.id)
            & (Attempt.student_id == student_id)
            & (Attempt.class_id == class_id),
        )
        .where(Skill.topic_id == topic.id, Skill.is_deleted == False)  # noqa: E712
        .group_by(Skill.id, Skill.name, Mastery.p_mastery)
    )
    skills = result.all()
    mastered = [
        (sid, name)
        for sid, name, mastery, count in skills
        if mastery is not None and mastery >= 0.95 and count >= 3
    ]
    existing_result = await session.execute(
        select(Achievement.kind, Achievement.resource_id).where(
            Achievement.student_id == student_id, Achievement.class_id == class_id
        )
    )
    existing = set(existing_result.all())
    for sid, name in mastered:
        if ("badge", sid) not in existing:
            session.add(
                Achievement(
                    student_id=student_id,
                    class_id=class_id,
                    kind="badge",
                    resource_id=sid,
                    title=name,
                )
            )
    if skills and len(mastered) == len(skills) and ("certificate", topic.id) not in existing:
        session.add(
            Achievement(
                student_id=student_id,
                class_id=class_id,
                kind="certificate",
                resource_id=topic.id,
                title=topic.name,
            )
        )
    await session.flush()
