"""Class and enrollment repository handling classroom operations and school statistics."""

import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assessment import Attempt, Mastery
from app.models.organization import Enrollment, School, SchoolClass
from app.repositories.base import BaseRepository


class ClassRepository(BaseRepository[SchoolClass]):
    """Repository operations for Classroom management, enrollment rosters, and stats."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(SchoolClass, session)

    async def create_class(
        self,
        teacher_id: uuid.UUID,
        school_id: uuid.UUID,
        name: str,
        grade: int,
        section: str = "A",
        academic_year: str = "2024-2025",
        join_code: str | None = None,
    ) -> SchoolClass:
        """Create and persist a new classroom."""
        from app.core.security import generate_join_code

        classroom = SchoolClass(
            id=uuid.uuid4(),
            teacher_id=teacher_id,
            school_id=school_id,
            name=name,
            grade=grade,
            section=section,
            academic_year=academic_year,
            join_code=join_code or generate_join_code(),
        )
        return await self.create(classroom)

    async def list_classes_by_teacher(self, teacher_id: uuid.UUID) -> Sequence[SchoolClass]:
        """Alias for get_classes_by_teacher."""
        return await self.get_classes_by_teacher(teacher_id)

    async def get_by_id_with_teacher(self, class_id: uuid.UUID) -> SchoolClass | None:
        """Fetch school class with teacher relationship eagerly loaded."""
        statement = (
            select(SchoolClass)
            .options(selectinload(SchoolClass.teacher))
            .where(
                SchoolClass.id == class_id,
                SchoolClass.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_join_code(self, join_code: str) -> SchoolClass | None:
        """Find an active class by its teacher-issued join code."""
        statement = select(SchoolClass).where(
            SchoolClass.join_code == join_code.strip().upper(),
            SchoolClass.is_deleted == False,  # noqa: E712
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_classes_by_teacher(self, teacher_id: uuid.UUID) -> Sequence[SchoolClass]:
        """Fetch all classes owned by a specific teacher."""
        statement = (
            select(SchoolClass)
            .where(
                SchoolClass.teacher_id == teacher_id,
                SchoolClass.is_deleted == False,  # noqa: E712
            )
            .order_by(SchoolClass.grade, SchoolClass.section)
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def get_all_active_classes(self) -> Sequence[SchoolClass]:
        """Fetch all active classes across the system (for admin views)."""
        statement = (
            select(SchoolClass)
            .where(SchoolClass.is_deleted == False)  # noqa: E712
            .order_by(SchoolClass.grade, SchoolClass.section)
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def rotate_join_code(self, class_id: uuid.UUID, new_code: str) -> SchoolClass | None:
        """Rotate the active join code for a classroom, immediately invalidating old codes."""
        school_class = await self.get_by_id(class_id)
        if school_class is not None:
            school_class.join_code = new_code
            await self.session.flush()
        return school_class

    async def get_enrollments(self, class_id: uuid.UUID) -> Sequence[Enrollment]:
        """Fetch all student enrollments in a class with student records loaded."""
        statement = (
            select(Enrollment)
            .options(selectinload(Enrollment.student))
            .where(Enrollment.class_id == class_id)
            .order_by(Enrollment.created_at)
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def get_enrollment(
        self,
        class_id: uuid.UUID,
        student_id: uuid.UUID,
    ) -> Enrollment | None:
        """Fetch an individual student enrollment in a class."""
        statement = select(Enrollment).where(
            Enrollment.class_id == class_id,
            Enrollment.student_id == student_id,
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def add_enrollment(
        self,
        class_id: uuid.UUID,
        student_id: uuid.UUID,
        roll_number: str | None = None,
        status: str = "active",
    ) -> Enrollment:
        """Enroll a student in a class or reactivate existing membership."""
        existing = await self.get_enrollment(class_id, student_id)
        if existing is not None:
            existing.status = status
            if roll_number:
                existing.roll_number = roll_number
            await self.session.flush()
            return existing

        enrollment = Enrollment(
            class_id=class_id,
            student_id=student_id,
            roll_number=roll_number,
            status=status,
        )
        self.session.add(enrollment)
        await self.session.flush()
        return enrollment

    async def approve_enrollment(
        self,
        class_id: uuid.UUID,
        student_id: uuid.UUID,
    ) -> Enrollment | None:
        """Teacher approves a student's pending enrollment."""
        enrollment = await self.get_enrollment(class_id, student_id)
        if enrollment is not None:
            enrollment.status = "active"
            await self.session.flush()
        return enrollment

    async def remove_enrollment(
        self,
        class_id: uuid.UUID,
        student_id: uuid.UUID,
    ) -> bool:
        """Remove a student from a class."""
        enrollment = await self.get_enrollment(class_id, student_id)
        if enrollment is not None:
            enrollment.status = "removed"
            await self.session.flush()
            return True
        return False

    async def get_student_enrollments(self, student_id: uuid.UUID) -> Sequence[Enrollment]:
        """Fetch all class enrollments for a given student."""
        statement = (
            select(Enrollment)
            .options(selectinload(Enrollment.school_class))
            .where(
                Enrollment.student_id == student_id,
                Enrollment.status == "active",
            )
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def get_school_stats(self) -> dict[str, object]:
        """Aggregate high-level school analytics with zero student PII."""
        # 1. Total counts
        total_schools_res = await self.session.execute(
            select(func.count(School.id)).where(School.is_deleted == False)  # noqa: E712
        )
        total_schools = total_schools_res.scalar() or 0

        total_classes_res = await self.session.execute(
            select(func.count(SchoolClass.id)).where(SchoolClass.is_deleted == False)  # noqa: E712
        )
        total_classes = total_classes_res.scalar() or 0

        total_students_res = await self.session.execute(
            select(func.count(func.distinct(Enrollment.student_id))).where(
                Enrollment.status == "active"
            )
        )
        total_students = total_students_res.scalar() or 0

        total_attempts_res = await self.session.execute(select(func.count(Attempt.id)))
        total_attempts = total_attempts_res.scalar() or 0

        avg_mastery_res = await self.session.execute(select(func.avg(Mastery.p_mastery)))
        raw_avg = avg_mastery_res.scalar()
        average_mastery = round(float(raw_avg), 3) if raw_avg is not None else 0.500

        # Grade distribution
        grade_dist_stmt = (
            select(SchoolClass.grade, func.count(Enrollment.id))
            .join(Enrollment, Enrollment.class_id == SchoolClass.id)
            .where(
                SchoolClass.is_deleted == False,  # noqa: E712
                Enrollment.status == "active",
            )
            .group_by(SchoolClass.grade)
            .order_by(SchoolClass.grade)
        )
        grade_res = await self.session.execute(grade_dist_stmt)
        grade_distribution = {int(grade): int(count) for grade, count in grade_res.all()}

        return {
            "total_schools": total_schools,
            "total_classes": total_classes,
            "total_students": total_students,
            "total_attempts": total_attempts,
            "average_mastery": average_mastery,
            "grade_distribution": grade_distribution,
        }
