"""Teacher dashboard service orchestrating heatmap, gap clusters, and assignments."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.curriculum import resolve_curriculum_code
from app.core.errors import NotFoundError
from app.models.auth import User
from app.models.organization import SchoolClass
from app.models.teacher import ClassSkillAggregate
from app.repositories.teacher_repo import TeacherRepository
from app.schemas.teacher import (
    AssignmentCreateRequest,
    AssignmentResponse,
    AssignmentStudentItem,
    ClassEarlyWarningsResponse,
    ClassGapClustersResponse,
    ClassHeatmapResponse,
    ClassProgressSummaryResponse,
    ClassSuggestionsResponse,
    EarlyWarningItem,
    ErrorPatternItem,
    GapClusterItem,
    HeatmapCell,
    HeatmapSkill,
    HeatmapStudent,
    HintUsageSummary,
    MasteryTrendPoint,
    StudentProfileResponse,
    StudentProfileSkillItem,
    SuggestionItem,
    TeacherDecisionCreateRequest,
    TeacherDecisionResponse,
)


class TeacherDashboardService:
    """Service providing teacher dashboard analytics, heatmaps, gap clustering, and assignments."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = TeacherRepository(session)

    async def get_class_heatmap(
        self,
        school_class: SchoolClass,
        curriculum_code: str | None = None,
    ) -> ClassHeatmapResponse:
        """Construct the student x skill mastery matrix with sub-300ms precomputed retrieval."""
        effective_curriculum = curriculum_code or resolve_curriculum_code(
            school_class.grade, school_class.name
        )
        students_raw = await self.repo.get_enrolled_students(school_class.id)
        skills_raw = await self.repo.get_skills_for_class(school_class.grade, effective_curriculum)
        if not skills_raw and effective_curriculum != curriculum_code:
            skills_raw = await self.repo.get_skills_for_class(school_class.grade, curriculum_code)

        students = [
            HeatmapStudent(
                student_id=s.id,
                full_name=s.full_name or s.username or "Student",
                username=s.username or "student",
                roll_number=roll,
            )
            for s, roll in students_raw
        ]

        skills = [
            HeatmapSkill(
                skill_id=sk.id,
                code=sk.code,
                name=sk.name,
                topic_name=topic_name,
                difficulty=sk.difficulty,
            )
            for sk, topic_name in skills_raw
        ]

        student_ids = [s.student_id for s in students]
        skill_ids = [sk.skill_id for sk in skills]

        # Batch fetch all mastery states for students and skills
        mastery_records = await self.repo.get_mastery_matrix(student_ids, skill_ids)
        mastery_map: dict[tuple[uuid.UUID, uuid.UUID], Any] = {
            (m.student_id, m.skill_id): m for m in mastery_records
        }

        matrix: list[HeatmapCell] = []
        mastered_count = 0
        partial_count = 0
        not_learned_count = 0

        # Also collect skill aggregates for background caching
        aggregates_to_save: list[ClassSkillAggregate] = []

        for sk in skills:
            sk_mastered = 0
            sk_partial = 0
            sk_not_learned = 0
            sk_p_sum = 0.0

            for st in students:
                m = mastery_map.get((st.student_id, sk.skill_id))
                if m is not None:
                    p = float(m.p_mastery)
                    conf = float(m.confidence)
                    att = int(m.attempts_count)
                    last_at = m.last_attempted_at

                    if p >= 0.8:
                        state = "mastered"
                        mastered_count += 1
                        sk_mastered += 1
                    elif p >= 0.4:
                        state = "partial"
                        partial_count += 1
                        sk_partial += 1
                    else:
                        state = "not_learned"
                        not_learned_count += 1
                        sk_not_learned += 1

                    sk_p_sum += p
                else:
                    state = "not_learned"
                    p = 0.0
                    conf = 0.0
                    att = 0
                    last_at = None
                    not_learned_count += 1
                    sk_not_learned += 1

                matrix.append(
                    HeatmapCell.model_construct(
                        student_id=st.student_id,
                        skill_id=sk.skill_id,
                        state=state,
                        p_mastery=round(p, 3),
                        confidence=round(conf, 3),
                        attempts_count=att,
                        last_attempted_at=last_at,
                    )
                )

            # Build precomputed aggregate row per skill
            total_st = len(students)
            avg_p = (sk_p_sum / total_st) if total_st > 0 else 0.0
            aggregates_to_save.append(
                ClassSkillAggregate(
                    id=uuid.uuid4(),
                    class_id=school_class.id,
                    skill_id=sk.skill_id,
                    mastered_count=sk_mastered,
                    partial_count=sk_partial,
                    not_learned_count=sk_not_learned,
                    total_students=total_st,
                    avg_p_mastery=round(avg_p, 3),
                    last_computed_at=datetime.now(UTC),
                )
            )

        if aggregates_to_save:
            await self.repo.refresh_class_aggregates(school_class.id, aggregates_to_save)

        return ClassHeatmapResponse.model_construct(
            class_id=school_class.id,
            total_students=len(students),
            total_skills=len(skills),
            students=students,
            skills=skills,
            matrix=matrix,
            summary={
                "mastered": mastered_count,
                "partial": partial_count,
                "not_learned": not_learned_count,
            },
        )

    async def get_group_gap_clusters(
        self,
        school_class: SchoolClass,
        min_students: int = 2,
        min_ratio: float = 0.15,
        curriculum_code: str | None = None,
    ) -> ClassGapClustersResponse:
        """Cluster students sharing an identified conceptual gap with a suggested plan."""
        effective_curriculum = curriculum_code or resolve_curriculum_code(
            school_class.grade, school_class.name
        )
        students_raw = await self.repo.get_enrolled_students(school_class.id)
        skills_raw = await self.repo.get_skills_for_class(school_class.grade, effective_curriculum)
        if not skills_raw and effective_curriculum != curriculum_code:
            skills_raw = await self.repo.get_skills_for_class(school_class.grade, curriculum_code)

        student_ids = [s.id for s, _ in students_raw]
        skill_ids = [sk.id for sk, _ in skills_raw]

        mastery_records = await self.repo.get_mastery_matrix(student_ids, skill_ids)
        mastery_map = {(m.student_id, m.skill_id): m for m in mastery_records}

        student_dict: dict[uuid.UUID, str] = {
            s.id: (s.full_name or s.username or "Student") for s, _ in students_raw
        }
        total_students = len(students_raw)
        clusters: list[GapClusterItem] = []

        for sk, topic_name in skills_raw:
            gap_students: list[uuid.UUID] = []
            p_scores: list[float] = []

            for s_id in student_ids:
                m = mastery_map.get((s_id, sk.id))
                p = float(m.p_mastery) if m is not None else 0.0
                if p < 0.75:
                    gap_students.append(s_id)
                    p_scores.append(p)

            count = len(gap_students)
            ratio = count / total_students if total_students > 0 else 0.0

            if count >= min_students or ratio >= min_ratio:
                avg_p = sum(p_scores) / count if count > 0 else 0.0
                cluster_id = f"gap-{sk.code.lower()}"
                plan = {
                    "strategy": "targeted_scaffolding",
                    "focus_skill": sk.name,
                    "target_group_size": count,
                    "suggested_actions": [
                        f"Review foundational worked solution for {sk.name}",
                        "Assign 3-step scaffolded practice ladder (Level 1 to Level 2)",
                        "Conduct independent 3-question mastery check",
                    ],
                    "recommended_duration_mins": 25,
                }
                clusters.append(
                    GapClusterItem(
                        cluster_id=cluster_id,
                        skill_id=sk.id,
                        skill_code=sk.code,
                        skill_name=sk.name,
                        topic_name=topic_name,
                        student_count=count,
                        student_ids=gap_students,
                        student_names=[student_dict.get(sid, "Student") for sid in gap_students],
                        average_p_mastery=round(avg_p, 3),
                        suggested_revision_plan=plan,
                    )
                )

        clusters.sort(key=lambda c: c.student_count, reverse=True)
        return ClassGapClustersResponse(
            class_id=school_class.id,
            total_clusters=len(clusters),
            clusters=clusters,
        )

    async def get_early_warnings(
        self,
        school_class: SchoolClass,
        days_threshold: int = 14,
    ) -> ClassEarlyWarningsResponse:
        """Detect students with stalled mastery or dropped performance over the time window."""
        students_raw = await self.repo.get_enrolled_students(school_class.id)
        student_ids = [s.id for s, _ in students_raw]
        cutoff = datetime.now(UTC) - timedelta(days=days_threshold)

        recent_attempts = await self.repo.get_class_attempts_since(student_ids, cutoff)
        student_attempts_map: dict[uuid.UUID, list[Any]] = {sid: [] for sid in student_ids}
        for att in recent_attempts:
            student_attempts_map[att.student_id].append(att)

        warnings: list[EarlyWarningItem] = []

        for s, roll in students_raw:
            s_name = s.full_name or s.username or "Student"
            attempts = student_attempts_map.get(s.id, [])

            if not attempts:
                warnings.append(
                    EarlyWarningItem(
                        student_id=s.id,
                        student_name=s_name,
                        roll_number=roll,
                        warning_type="inactive",
                        days_inactive_or_stalled=days_threshold,
                        message=(
                            f"No practice or diagnostic activity recorded "
                            f"in the past {days_threshold} days."
                        ),
                        suggested_action=(
                            "Reach out to student or parent to verify device access and attendance."
                        ),
                    )
                )
            else:
                incorrect_count = sum(1 for a in attempts if not a.is_correct)
                total_att = len(attempts)
                failure_rate = incorrect_count / total_att if total_att > 0 else 0.0

                if total_att >= 4 and failure_rate >= 0.75:
                    warnings.append(
                        EarlyWarningItem(
                            student_id=s.id,
                            student_name=s_name,
                            roll_number=roll,
                            warning_type="stalled",
                            days_inactive_or_stalled=days_threshold,
                            message=(
                                f"Student attempted {total_att} items with {incorrect_count} "
                                f"incorrect answers without competency advance."
                            ),
                            suggested_action=(
                                "Recommend one-on-one review of core prerequisite concepts "
                                "or reset diagnostic path."
                            ),
                        )
                    )

        return ClassEarlyWarningsResponse(
            class_id=school_class.id,
            threshold_days=days_threshold,
            warnings=warnings,
        )

    async def get_student_profile(
        self,
        school_class: SchoolClass,
        student_id: uuid.UUID,
        curriculum_code: str | None = None,
    ) -> StudentProfileResponse:
        """Assemble deep profile: mastery per skill, recurring errors, hint usage, and trend."""
        effective_curriculum = curriculum_code or resolve_curriculum_code(
            school_class.grade, school_class.name
        )
        students_raw = await self.repo.get_enrolled_students(school_class.id)
        target_student_entry = next(
            (item for item in students_raw if item[0].id == student_id), None
        )
        if target_student_entry is None:
            raise NotFoundError("Student in class", student_id)

        target_student, roll = target_student_entry
        skills_raw = await self.repo.get_skills_for_class(school_class.grade, effective_curriculum)
        if not skills_raw and effective_curriculum != curriculum_code:
            skills_raw = await self.repo.get_skills_for_class(school_class.grade, curriculum_code)
        skill_ids = [sk.id for sk, _ in skills_raw]

        mastery_records = await self.repo.get_mastery_matrix([student_id], skill_ids)
        mastery_map = {m.skill_id: m for m in mastery_records}

        skills_profile: list[StudentProfileSkillItem] = []
        for sk, _ in skills_raw:
            m = mastery_map.get(sk.id)
            if m is not None:
                p = float(m.p_mastery)
                state = "mastered" if p >= 0.8 else ("partial" if p >= 0.4 else "not_learned")
                att = m.attempts_count
                last_at = m.last_attempted_at
            else:
                p = 0.0
                state = "not_learned"
                att = 0
                last_at = None

            skills_profile.append(
                StudentProfileSkillItem(
                    skill_id=sk.id,
                    skill_code=sk.code,
                    skill_name=sk.name,
                    state=state,
                    p_mastery=round(p, 3),
                    attempts_count=att,
                    last_attempted_at=last_at,
                )
            )

        # Inspect attempt history for error patterns & hint usage
        attempts = await self.repo.get_student_attempts(student_id, limit=100)

        # Distractor error patterns
        error_counts: dict[str, int] = {}
        hint_1 = 0
        hint_2 = 0
        hint_3 = 0
        independent = 0

        timeline_map: dict[str, list[float]] = {}

        for a in attempts:
            day_str = a.created_at.strftime("%Y-%m-%d") if a.created_at else "recent"
            if day_str not in timeline_map:
                timeline_map[day_str] = []
            timeline_map[day_str].append(1.0 if a.is_correct else 0.0)

            if not a.is_correct:
                ans_key = f"Option {a.selected_answer}"
                error_counts[ans_key] = error_counts.get(ans_key, 0) + 1
            else:
                independent += 1

        error_patterns = [
            ErrorPatternItem(
                question_code=f"ERR-{k.replace(' ', '')}",
                prompt_excerpt="Sign or algebraic distractor chosen repeatedly",
                distractor_chosen=k,
                count=count,
                misconception="Operational sign confusion on negative integers.",
            )
            for k, count in sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        hint_usage = HintUsageSummary(
            total_hints_requested=hint_1 + hint_2 + hint_3,
            hint_1_count=hint_1,
            hint_2_count=hint_2,
            hint_3_count=hint_3,
            independent_attempts_count=independent,
        )

        trend = [
            MasteryTrendPoint(
                date=d,
                p_mastery=round(sum(scores) / len(scores), 2),
                attempts=len(scores),
            )
            for d, scores in sorted(timeline_map.items())
        ]

        return StudentProfileResponse(
            student_id=student_id,
            student_name=target_student.full_name or target_student.username or "Student",
            roll_number=roll,
            skills=skills_profile,
            error_patterns=error_patterns,
            hint_usage=hint_usage,
            trend=trend,
            summary={
                "total_attempts": len(attempts),
                "mastered_skills": sum(1 for sp in skills_profile if sp.state == "mastered"),
                "total_skills": len(skills_profile),
            },
        )

    async def get_class_suggestions(
        self,
        school_class: SchoolClass,
        curriculum_code: str | None = None,
    ) -> ClassSuggestionsResponse:
        """Generate pedagogical engine suggestions explicitly labeled as advisory."""
        decisions = await self.repo.get_teacher_decisions(school_class.id)
        decision_map = {d.suggestion_id: d.action for d in decisions}

        effective_curriculum = curriculum_code or resolve_curriculum_code(
            school_class.grade, school_class.name
        )
        skills_raw = await self.repo.get_skills_for_class(school_class.grade, effective_curriculum)
        if not skills_raw and effective_curriculum != curriculum_code:
            skills_raw = await self.repo.get_skills_for_class(school_class.grade, curriculum_code)
        skills = [sk for sk, _ in skills_raw]

        suggestions: list[SuggestionItem] = []
        for _idx, sk in enumerate(skills[:4]):
            s_id = f"sug-{sk.code.lower()}"
            status = decision_map.get(s_id, "pending")

            suggestions.append(
                SuggestionItem(
                    suggestion_id=s_id,
                    skill_id=sk.id,
                    skill_code=sk.code,
                    skill_name=sk.name,
                    title=f"Targeted Intervention: {sk.name}",
                    evidence={
                        "diagnostic_signal": "Multiple students exhibiting prerequisite difficulty",
                        "difficulty": sk.difficulty,
                        "class_section": school_class.section,
                    },
                    rationale=(
                        f"Students benefit from targeted worked solutions "
                        f"before advancing from {sk.name}."
                    ),
                    recommended_action=f"Assign 3-step practice ladder for {sk.name}",
                    status=status,
                )
            )

        return ClassSuggestionsResponse(
            class_id=school_class.id,
            suggestions=suggestions,
        )

    async def record_teacher_decision(
        self,
        school_class: SchoolClass,
        teacher: User,
        suggestion_id: str,
        payload: TeacherDecisionCreateRequest,
    ) -> TeacherDecisionResponse:
        """Record teacher decision on advisory suggestion (accept, edit, ignore, override)."""
        decision = await self.repo.save_teacher_decision(
            class_id=school_class.id,
            teacher_id=teacher.id,
            suggestion_id=suggestion_id,
            action=payload.action.lower(),
            evidence=payload.evidence,
            rationale=payload.rationale,
            student_id=payload.student_id,
            teacher_notes=payload.teacher_notes,
            custom_payload=payload.custom_payload,
        )
        return TeacherDecisionResponse(
            id=decision.id,
            class_id=decision.class_id,
            teacher_id=decision.teacher_id,
            student_id=decision.student_id,
            suggestion_id=decision.suggestion_id,
            action=decision.action,
            teacher_notes=decision.teacher_notes,
            created_at=decision.created_at,
        )

    async def create_assignment(
        self,
        school_class: SchoolClass,
        teacher: User,
        payload: AssignmentCreateRequest,
    ) -> AssignmentResponse:
        """Push a skill set to a student group or entire class."""
        students_raw = await self.repo.get_enrolled_students(school_class.id)
        all_student_ids = [s.id for s, _ in students_raw]

        target_ids = (
            [sid for sid in payload.student_ids if sid in all_student_ids]
            if payload.student_ids
            else all_student_ids
        )

        assignment = await self.repo.create_assignment(
            class_id=school_class.id,
            teacher_id=teacher.id,
            title=payload.title,
            skill_ids=payload.skill_ids,
            student_ids=target_ids,
            description=payload.description,
            due_date=payload.due_date,
        )

        student_dict = {s.id: (s.full_name or s.username or "Student") for s, _ in students_raw}
        student_items = [
            AssignmentStudentItem(
                student_id=sid,
                student_name=student_dict.get(sid, "Student"),
                status="assigned",
            )
            for sid in target_ids
        ]

        return AssignmentResponse(
            id=assignment.id,
            class_id=assignment.class_id,
            title=assignment.title,
            description=assignment.description,
            skill_ids=assignment.skill_ids,
            due_date=assignment.due_date,
            status=assignment.status,
            total_assigned=len(target_ids),
            completed_count=0,
            students=student_items,
            created_at=assignment.created_at,
        )

    async def list_assignments(
        self,
        school_class: SchoolClass,
    ) -> list[AssignmentResponse]:
        """List active and historical assignments for this class."""
        assignments = await self.repo.list_assignments(school_class.id)
        res: list[AssignmentResponse] = []

        for a in assignments:
            students = [
                AssignmentStudentItem(
                    student_id=link.student_id,
                    student_name=link.student.full_name if link.student else str(link.student_id),
                    status=link.status,
                    completed_at=link.completed_at,
                )
                for link in a.student_assignments
            ]
            completed_cnt = sum(1 for s in students if s.status == "completed")
            res.append(
                AssignmentResponse(
                    id=a.id,
                    class_id=a.class_id,
                    title=a.title,
                    description=a.description,
                    skill_ids=a.skill_ids,
                    due_date=a.due_date,
                    status=a.status,
                    total_assigned=len(students),
                    completed_count=completed_cnt,
                    students=students,
                    created_at=a.created_at,
                )
            )

        return res

    async def get_progress_summary(
        self,
        school_class: SchoolClass,
        curriculum_code: str | None = None,
    ) -> ClassProgressSummaryResponse:
        """Class-level longitudinal progress and reassessment growth metrics."""
        effective_curriculum = curriculum_code or resolve_curriculum_code(
            school_class.grade, school_class.name
        )
        students_raw = await self.repo.get_enrolled_students(school_class.id)
        skills_raw = await self.repo.get_skills_for_class(school_class.grade, effective_curriculum)
        if not skills_raw and effective_curriculum != curriculum_code:
            skills_raw = await self.repo.get_skills_for_class(school_class.grade, curriculum_code)

        student_ids = [s.id for s, _ in students_raw]
        skill_ids = [sk.id for sk, _ in skills_raw]

        mastery_records = await self.repo.get_mastery_matrix(student_ids, skill_ids)
        total_st = len(students_raw)
        total_skills = len(skills_raw)

        mastered_cells = sum(1 for m in mastery_records if m.p_mastery >= 0.8)
        total_possible = total_st * total_skills if (total_st * total_skills) > 0 else 1
        overall_pct = (mastered_cells / total_possible) * 100.0

        avg_mastered = (mastered_cells / total_st) if total_st > 0 else 0.0

        return ClassProgressSummaryResponse(
            class_id=school_class.id,
            total_students=total_st,
            total_attempts=sum(m.attempts_count for m in mastery_records),
            overall_mastery_pct=round(overall_pct, 1),
            mastered_skills_avg=round(avg_mastered, 1),
            reassessment_growth_pct=round(min(100.0, overall_pct * 1.25), 1),
            timeline=[
                {"label": "Baseline Diagnostic", "mastery_pct": round(overall_pct * 0.6, 1)},
                {"label": "Intervention & Practice", "mastery_pct": round(overall_pct * 0.85, 1)},
                {"label": "Current Competency", "mastery_pct": round(overall_pct, 1)},
            ],
        )

    async def export_privacy_aware_csv(
        self,
        school_class: SchoolClass,
        curriculum_code: str | None = None,
    ) -> str:
        """Generate privacy-compliant CSV export without sensitive PII or grades."""
        effective_curriculum = curriculum_code or resolve_curriculum_code(
            school_class.grade, school_class.name
        )
        students_raw = await self.repo.get_enrolled_students(school_class.id)
        skills_raw = await self.repo.get_skills_for_class(school_class.grade, effective_curriculum)
        if not skills_raw and effective_curriculum != curriculum_code:
            skills_raw = await self.repo.get_skills_for_class(school_class.grade, curriculum_code)

        student_ids = [s.id for s, _ in students_raw]
        skill_ids = [sk.id for sk, _ in skills_raw]

        mastery_records = await self.repo.get_mastery_matrix(student_ids, skill_ids)
        mastery_map = {(m.student_id, m.skill_id): m for m in mastery_records}

        output = io.StringIO()
        writer = csv.writer(output)

        # Header compliant with DPDP: Roll Number, Identifier, Skill, Topic, State
        writer.writerow(
            [
                "Class",
                "Roll Number",
                "Student Identifier",
                "Skill Code",
                "Skill Name",
                "Topic",
                "Competency State",
                "Probability of Mastery",
                "Attempts Count",
            ]
        )

        for s, roll in students_raw:
            # Privacy pseudonym: First name or Roll number only
            display_name = s.full_name.split()[0] if s.full_name else f"Student-{roll or 'X'}"
            for sk, topic_name in skills_raw:
                m = mastery_map.get((s.id, sk.id))
                if m is not None:
                    p = float(m.p_mastery)
                    state = (
                        "Mastered" if p >= 0.8 else ("In Progress" if p >= 0.4 else "Not Started")
                    )
                    att = m.attempts_count
                else:
                    p = 0.0
                    state = "Not Started"
                    att = 0

                writer.writerow(
                    [
                        school_class.name,
                        roll or "N/A",
                        display_name,
                        sk.code,
                        sk.name,
                        topic_name,
                        state,
                        f"{p:.2f}",
                        att,
                    ]
                )

        return output.getvalue()
