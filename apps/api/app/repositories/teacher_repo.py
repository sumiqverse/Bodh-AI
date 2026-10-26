"""Teacher repository for class analytics, heatmap aggregates, decisions, and assignments."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import datetime
from typing import Any

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assessment import Attempt, Mastery
from app.models.auth import User
from app.models.curriculum import Curriculum, Skill, Topic
from app.models.organization import Enrollment, SchoolClass
from app.models.teacher import (
    Assignment,
    AssignmentStudent,
    ClassSkillAggregate,
    TeacherDecision,
)
from app.repositories.base import BaseRepository


class TeacherRepository(BaseRepository[SchoolClass]):
    """Repository operations for teacher dashboard, aggregates, assignments, decisions."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(SchoolClass, session)

    async def get_enrolled_students(self, class_id: uuid.UUID) -> Sequence[tuple[User, str | None]]:
        """Fetch all active enrolled student users with their roll numbers for a class."""
        statement = (
            select(User, Enrollment.roll_number)
            .join(Enrollment, Enrollment.student_id == User.id)
            .where(
                Enrollment.class_id == class_id,
                Enrollment.status == "active",
                User.is_deleted == False,  # noqa: E712
            )
            .order_by(Enrollment.roll_number.asc(), User.full_name.asc())
        )
        result = await self.session.execute(statement)
        return result.all()

    async def get_skills_for_class(
        self, class_grade: int, curriculum_code: str | None = None
    ) -> Sequence[tuple[Skill, str]]:
        """Fetch skills and associated topic name matching grade or curriculum code."""
        statement = (
            select(Skill, Topic.name.label("topic_name"))
            .join(Topic, Skill.topic_id == Topic.id)
            .join(Curriculum, Topic.curriculum_id == Curriculum.id)
            .where(Skill.is_deleted == False)  # noqa: E712
        )
        if curriculum_code:
            statement = statement.where(Curriculum.code == curriculum_code)
        else:
            statement = statement.where(Curriculum.grade == class_grade)

        statement = statement.order_by(
            Topic.sequence_order.asc(), Skill.difficulty.asc(), Skill.code.asc()
        )
        result = await self.session.execute(statement)
        return result.all()

    async def get_mastery_matrix(
        self, student_ids: Sequence[uuid.UUID], skill_ids: Sequence[uuid.UUID]
    ) -> Sequence[Mastery]:
        """Batch fetch all mastery records for a set of students."""
        if not student_ids or not skill_ids:
            return []
        statement = select(Mastery).where(Mastery.student_id.in_(student_ids))
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def get_cached_skill_aggregates(
        self, class_id: uuid.UUID
    ) -> Sequence[ClassSkillAggregate]:
        """Fetch precomputed class skill aggregates."""
        statement = select(ClassSkillAggregate).where(ClassSkillAggregate.class_id == class_id)
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def refresh_class_aggregates(
        self,
        class_id: uuid.UUID,
        aggregates: Sequence[ClassSkillAggregate],
    ) -> None:
        """Replace precomputed aggregates for a class section."""
        # Clear old precomputations
        await self.session.execute(
            delete(ClassSkillAggregate).where(ClassSkillAggregate.class_id == class_id)
        )
        for agg in aggregates:
            self.session.add(agg)
        await self.session.flush()

    async def get_student_attempts(
        self, student_id: uuid.UUID, limit: int = 100
    ) -> Sequence[Attempt]:
        """Retrieve student's recent practice and diagnostic attempts with questions."""
        statement = (
            select(Attempt)
            .where(Attempt.student_id == student_id)
            .order_by(desc(Attempt.created_at))
            .limit(limit)
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def get_class_attempts_since(
        self, student_ids: Sequence[uuid.UUID], since: datetime
    ) -> Sequence[Attempt]:
        """Retrieve all attempts for enrolled students since a given timestamp."""
        if not student_ids:
            return []
        statement = (
            select(Attempt)
            .where(
                Attempt.student_id.in_(student_ids),
                Attempt.created_at >= since,
            )
            .order_by(Attempt.created_at.desc())
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def save_teacher_decision(
        self,
        class_id: uuid.UUID,
        teacher_id: uuid.UUID,
        suggestion_id: str,
        action: str,
        evidence: dict[str, Any],
        rationale: str,
        student_id: uuid.UUID | None = None,
        teacher_notes: str | None = None,
        custom_payload: dict[str, Any] | None = None,
    ) -> TeacherDecision:
        """Store teacher audit decision on an AI or curriculum suggestion."""
        decision = TeacherDecision(
            id=uuid.uuid4(),
            class_id=class_id,
            teacher_id=teacher_id,
            student_id=student_id,
            suggestion_id=suggestion_id,
            action=action,
            evidence=evidence,
            rationale=rationale,
            teacher_notes=teacher_notes,
            custom_payload=custom_payload,
        )
        self.session.add(decision)
        await self.session.flush()
        return decision

    async def get_teacher_decisions(self, class_id: uuid.UUID) -> Sequence[TeacherDecision]:
        """Fetch all decisions recorded by teacher for this class."""
        statement = (
            select(TeacherDecision)
            .where(TeacherDecision.class_id == class_id)
            .order_by(desc(TeacherDecision.created_at))
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def create_assignment(
        self,
        class_id: uuid.UUID,
        teacher_id: uuid.UUID,
        title: str,
        skill_ids: list[str],
        student_ids: Sequence[uuid.UUID],
        description: str | None = None,
        due_date: datetime | None = None,
    ) -> Assignment:
        """Create assignment and link assigned students."""
        assignment = Assignment(
            id=uuid.uuid4(),
            class_id=class_id,
            teacher_id=teacher_id,
            title=title.strip(),
            description=description.strip() if description else None,
            skill_ids=skill_ids,
            due_date=due_date,
            status="active",
        )
        self.session.add(assignment)
        await self.session.flush()

        for s_id in student_ids:
            link = AssignmentStudent(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                student_id=s_id,
                status="assigned",
            )
            self.session.add(link)

        await self.session.flush()
        return assignment

    async def list_assignments(self, class_id: uuid.UUID) -> Sequence[Assignment]:
        """Fetch all assignments for a class section including assigned student links."""
        statement = (
            select(Assignment)
            .options(
                selectinload(Assignment.student_assignments).selectinload(AssignmentStudent.student)
            )
            .where(Assignment.class_id == class_id)
            .order_by(desc(Assignment.created_at))
        )
        result = await self.session.execute(statement)
        return result.scalars().all()
