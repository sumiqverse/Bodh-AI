"""Educational Profiles API Router: Student and Teacher profiles with live database telemetry."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db, require_role
from app.core.curriculum import resolve_curriculum_code
from app.models.achievement import Achievement
from app.models.assessment import Attempt, Mastery
from app.models.auth import Role, User
from app.models.curriculum import Skill
from app.models.organization import Consent, Enrollment, SchoolClass
from app.models.teacher import Assignment, TeacherDecision

router = APIRouter(prefix="/profiles", tags=["Educational Profiles"])


class ProfileUpdateRequest(BaseModel):
    fullName: str | None = None
    employeeId: str | None = None
    fullNameHi: str | None = None
    title: str | None = None
    titleHi: str | None = None
    experienceYears: int | None = None
    schoolName: str | None = None
    department: str | None = None
    qualifications: str | None = None
    bio: str | None = None
    bioHi: str | None = None
    phone: str | None = None
    officeHours: str | None = None
    specializations: list[str] | None = None
    avatarUrl: str | None = None
    age: int | None = None
    guardianName: str | None = None
    guardianRelation: str | None = None


class SetupCohortRequest(BaseModel):
    grade: int = 8
    section: str = "B"
    subject: str = "Mathematics"
    className: str | None = None


async def build_teacher_profile_dict(teacher: User, session: AsyncSession) -> dict[str, Any]:
    """Dynamically aggregate real database telemetry for a teacher profile."""
    cls_stmt = (
        select(SchoolClass)
        .where(
            SchoolClass.teacher_id == teacher.id,
            SchoolClass.is_deleted.is_(False),
        )
        .order_by(SchoolClass.created_at.desc())
    )
    classes = (await session.execute(cls_stmt)).scalars().all()

    class_items = []
    total_class_mastery_sum = 0.0
    total_classes_with_mastery = 0

    for cls in classes:
        stu_cnt_stmt = select(func.count(distinct(Enrollment.student_id))).where(
            Enrollment.class_id == cls.id,
            Enrollment.status == "active",
        )
        stu_count = (await session.execute(stu_cnt_stmt)).scalar() or 0

        mastery_stmt = (
            select(func.coalesce(func.avg(Mastery.p_mastery), 0.0))
            .select_from(Mastery)
            .join(Enrollment, Mastery.student_id == Enrollment.student_id)
            .where(
                Enrollment.class_id == cls.id,
                Enrollment.status == "active",
                Mastery.class_id == cls.id,
            )
        )
        avg_mast_raw = (await session.execute(mastery_stmt)).scalar() or 0.0
        avg_mast_pct = round(float(avg_mast_raw) * 100, 1)
        if avg_mast_pct > 0:
            total_class_mastery_sum += avg_mast_pct
            total_classes_with_mastery += 1

        asgn_stmt = select(func.count(Assignment.id)).where(
            Assignment.class_id == cls.id,
            Assignment.status == "active",
        )
        asgn_count = (await session.execute(asgn_stmt)).scalar() or 0

        class_items.append(
            {
                "id": str(cls.id),
                "name": cls.name,
                "grade": cls.grade,
                "section": cls.section,
                "academicYear": cls.academic_year,
                "studentCount": stu_count,
                "avgMastery": avg_mast_pct,
                "activeAssignments": asgn_count,
                "joinCode": cls.join_code,
                "status": "active",
            }
        )

    total_students_stmt = (
        select(func.count(distinct(Enrollment.student_id)))
        .select_from(Enrollment)
        .join(SchoolClass, Enrollment.class_id == SchoolClass.id)
        .where(
            SchoolClass.teacher_id == teacher.id,
            Enrollment.status == "active",
        )
    )
    total_students_taught = (await session.execute(total_students_stmt)).scalar() or 0

    asgn_total_stmt = select(func.count(Assignment.id)).where(Assignment.teacher_id == teacher.id)
    total_assignments = (await session.execute(asgn_total_stmt)).scalar() or 0

    dec_stmt = (
        select(TeacherDecision)
        .where(TeacherDecision.teacher_id == teacher.id)
        .order_by(TeacherDecision.created_at.desc())
        .limit(10)
    )
    decisions = (await session.execute(dec_stmt)).scalars().all()
    dec_count_stmt = select(func.count(TeacherDecision.id)).where(
        TeacherDecision.teacher_id == teacher.id
    )
    total_decisions_count = (await session.execute(dec_count_stmt)).scalar() or 0

    decision_items = []
    for d in decisions:
        cls_name = "Classroom"
        for c in class_items:
            if c["id"] == str(d.class_id):
                cls_name = str(c["name"])
                break
        t_stamp = d.created_at.isoformat() if d.created_at else datetime.now(UTC).isoformat()
        s_title = (d.evidence.get("gap_cluster") if d.evidence else None) or d.suggestion_id
        sk_name = (d.evidence.get("topic") if d.evidence else None) or "Competency Intervention"
        decision_items.append(
            {
                "id": str(d.id),
                "className": cls_name,
                "suggestionTitle": s_title,
                "action": d.action,
                "timestamp": t_stamp,
                "rationale": d.rationale or "Reviewed and authorized by educator.",
                "skillName": sk_name,
            }
        )

    schedule: list[dict[str, str]] = []

    if total_classes_with_mastery > 0:
        avg_classroom_mastery = round(total_class_mastery_sum / total_classes_with_mastery, 1)
    else:
        avg_classroom_mastery = 0.0

    p_data = teacher.profile_data or {}
    clean_name = (teacher.full_name or teacher.username or "educator").lower().replace(" ", "-")
    slug = f"tchr-{clean_name}"
    exp_years = p_data.get("experienceYears")
    if exp_years is None:
        exp_years = 0

    return {
        "id": str(teacher.id),
        "slug": slug,
        "fullName": p_data.get("fullName") or teacher.full_name or "Educator",
        "fullNameHi": p_data.get("fullNameHi") or teacher.full_name or "शिक्षक",
        "title": p_data.get("title") or "",
        "titleHi": p_data.get("titleHi") or "",
        "employeeId": p_data.get("employeeId") or "",
        "email": teacher.email or "",
        "phone": teacher.phone or p_data.get("phone") or "",
        "schoolName": p_data.get("schoolName") or "",
        "department": p_data.get("department") or "",
        "qualifications": p_data.get("qualifications") or "",
        "experienceYears": exp_years,
        "avatarGradient": p_data.get("avatarGradient")
        or ("from-blue-600 via-indigo-600 to-purple-600"),
        "avatarUrl": p_data.get("avatarUrl") or "",
        "bio": p_data.get("bio") or "",
        "bioHi": p_data.get("bioHi") or "",
        "officeHours": p_data.get("officeHours") or "",
        "verifiedEducator": teacher.is_verified,
        "totalStudentsTaught": total_students_taught,
        "activeClassesCount": len(class_items),
        "avgClassroomMastery": avg_classroom_mastery,
        "totalAssignmentsCreated": total_assignments,
        "aiDecisionsReviewed": max(total_decisions_count, len(decision_items)),
        "classes": class_items,
        "pedagogicalDecisions": decision_items,
        "schedule": schedule,
        "specializations": p_data.get("specializations") or [],
    }


async def build_student_profile_dict(student: User, session: AsyncSession) -> dict[str, Any]:
    """Dynamically aggregate real database telemetry for a student profile."""
    all_enrs_stmt = (
        select(Enrollment)
        .options(
            selectinload(Enrollment.school_class).selectinload(SchoolClass.teacher),
        )
        .where(
            Enrollment.student_id == student.id,
            Enrollment.status.in_(["active", "pending"]),
        )
        .order_by(Enrollment.created_at.desc())
    )
    all_enrs = (await session.execute(all_enrs_stmt)).scalars().all()

    student_classes = []
    for e in all_enrs:
        if not e.school_class:
            continue
        sc = e.school_class
        t_name = sc.teacher.full_name if sc.teacher else "Educator"
        t_clean = (t_name or "educator").lower().replace(" ", "-")
        t_slug = f"tchr-{t_clean}"
        c_code = resolve_curriculum_code(sc.grade, sc.subject or sc.name)
        student_classes.append(
            {
                "classId": str(sc.id),
                "name": sc.name,
                "grade": sc.grade,
                "section": sc.section,
                "academicYear": sc.academic_year,
                "curriculumCode": c_code,
                "status": e.status,
                "diagnosticStatus": e.diagnostic_status,
                "rollNumber": e.roll_number,
                "teacherName": t_name,
                "teacherSlug": t_slug,
                "joinCode": sc.join_code,
            }
        )

    enr = all_enrs[0] if all_enrs else None
    grade = enr.school_class.grade if (enr and enr.school_class) else 8
    section = enr.school_class.section if (enr and enr.school_class) else "A"
    roll_num = enr.roll_number if enr else ""
    class_name = enr.school_class.name if (enr and enr.school_class) else f"Class {grade}-{section}"
    curriculum_code = (
        resolve_curriculum_code(grade, enr.school_class.subject or enr.school_class.name)
        if (enr and enr.school_class)
        else f"NCERT-MATH-C{grade}"
    )

    assigned_teacher_name = ""
    assigned_teacher_slug = ""
    if enr and enr.school_class and enr.school_class.teacher:
        assigned_teacher_name = enr.school_class.teacher.full_name or "Educator"
        t_clean = (assigned_teacher_name).lower().replace(" ", "-")
        assigned_teacher_slug = f"tchr-{t_clean}"

    mast_stmt = (
        select(Mastery, Skill)
        .join(Skill, Mastery.skill_id == Skill.id)
        .options(selectinload(Skill.topic))
        .where(Mastery.student_id == student.id)
    )
    mastery_rows = (await session.execute(mast_stmt)).all()

    skills_list = []
    p_sum = 0.0
    for m, sk in mastery_rows:
        p_mast = float(m.p_mastery)
        p_sum += p_mast
        topic_name = sk.topic.name if (sk and sk.topic) else "General Curriculum"
        topic_code = sk.topic.code if (sk and sk.topic) else "CH01"
        def_state = (
            "mastered"
            if p_mast >= 0.95 and m.attempts_count >= 3
            else ("partial" if p_mast >= 0.4 else "not_learned")
        )
        skills_list.append(
            {
                "skillId": str(m.skill_id),
                "skillCode": sk.code if sk else "SK-01",
                "skillName": sk.name if sk else "Curriculum Competency",
                "topicName": topic_name,
                "topicCode": topic_code,
                "difficulty": sk.difficulty if sk else 3,
                "pMastery": round(p_mast, 2),
                "state": def_state,
                "attemptsCount": m.attempts_count,
                "lastAttemptedAt": (
                    m.updated_at.isoformat() if m.updated_at else datetime.now(UTC).isoformat()
                ),
            }
        )

    overall_mastery = round((p_sum / len(skills_list)) * 100) if skills_list else 0
    attempts_result = await session.execute(select(Attempt).where(Attempt.student_id == student.id))
    attempts = list(attempts_result.scalars().all())
    total_solved = len(attempts)
    india_tz = timezone(timedelta(hours=5, minutes=30))
    active_days = {
        (a.created_at.replace(tzinfo=UTC) if a.created_at.tzinfo is None else a.created_at)
        .astimezone(india_tz)
        .date()
        for a in attempts
    }
    today = datetime.now(india_tz).date()
    day = today if today in active_days else today - timedelta(days=1)
    streak = 0
    while day in active_days:
        streak += 1
        day -= timedelta(days=1)
    accuracy_rate = (
        round(sum(attempt.is_correct for attempt in attempts) / total_solved * 100)
        if total_solved
        else 0
    )
    practice_hours = round(sum(attempt.time_spent_ms for attempt in attempts) / 3600000, 1)
    awards_result = await session.execute(
        select(Achievement).where(Achievement.student_id == student.id, Achievement.kind == "badge")
    )
    awards = awards_result.scalars().all()
    badges = [
        {
            "id": str(award.id),
            "title": award.title,
            "titleHi": award.title,
            "description": "Skill mastery",
            "icon": "Award",
            "unlockedAt": award.created_at.isoformat(),
            "category": "mastery",
            "color": "from-amber-500 to-orange-500",
        }
        for award in awards
    ]

    consent_result = await session.execute(
        select(Consent.id)
        .where(
            Consent.student_id == student.id,
            Consent.is_granted.is_(True),
            Consent.revoked_at.is_(None),
        )
        .limit(1)
    )
    has_consent = consent_result.scalar_one_or_none() is not None
    p_data = student.profile_data or {}
    s_clean = (student.full_name or student.username or "student").lower().replace(" ", "-")
    slug = f"stu-{s_clean}"

    return {
        "id": str(student.id),
        "slug": slug,
        "fullName": p_data.get("fullName") or student.full_name or "Student",
        "fullNameHi": p_data.get("fullNameHi") or student.full_name or "विद्यार्थी",
        "rollNumber": roll_num,
        "grade": grade,
        "section": section,
        "className": class_name,
        "curriculumCode": curriculum_code,
        "classId": str(enr.school_class.id) if (enr and enr.school_class) else None,
        "classes": student_classes,
        "academicYear": enr.school_class.academic_year if enr and enr.school_class else "",
        "schoolName": p_data.get("schoolName") or "",
        "schoolUdise": "",
        "age": p_data.get("age", 0),
        "avatarGradient": "from-emerald-500 to-teal-700",
        "avatarUrl": p_data.get("avatarUrl") or "",
        "bio": p_data.get("bio") or "",
        "bioHi": p_data.get("bioHi") or "",
        "preferredLanguage": student.preferred_language or "en",
        "dpdpConsentGranted": has_consent,
        "guardianName": p_data.get("guardianName") or "",
        "guardianRelation": p_data.get("guardianRelation") or "",
        "overallMastery": overall_mastery,
        "learningStreakDays": streak,
        "accuracyRate": accuracy_rate,
        "totalQuestionsSolved": total_solved,
        "practiceHours": practice_hours,
        "attendanceRate": 0,
        "assignedTeacherName": assigned_teacher_name,
        "assignedTeacherSlug": assigned_teacher_slug,
        "skills": skills_list,
        "errorPatterns": [],
        "hintUsage": {
            "totalHintsRequested": 0,
            "hint1Count": 0,
            "hint2Count": 0,
            "hint3Count": 0,
            "independentAttemptsCount": 0,
            "independenceRatio": 0,
        },
        "trend": [],
        "recentActivities": [],
        "badges": badges,
        "recommendedSteps": [],
    }


@router.get("/me", summary="Get authenticated user profile with live telemetry")
async def get_my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Return live database telemetry profile for authenticated teacher or student."""
    role_name = (current_user.role.name if current_user.role else "teacher").lower()
    if role_name == "student":
        profile = await build_student_profile_dict(current_user, session)
        return {"type": "student", "profile": profile}

    profile = await build_teacher_profile_dict(current_user, session)
    return {"type": "teacher", "profile": profile}


@router.put("/me", summary="Update user profile metadata in database")
async def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Persist educator or student profile edits directly to PostgreSQL."""
    if payload.fullName:
        current_user.full_name = payload.fullName.strip()
    if payload.phone is not None:
        current_user.phone = payload.phone.strip()

    p_data = dict(current_user.profile_data or {})
    if payload.fullName is not None:
        p_data["fullName"] = payload.fullName.strip()
    if payload.employeeId is not None:
        p_data["employeeId"] = payload.employeeId.strip()
    if payload.fullNameHi is not None:
        p_data["fullNameHi"] = payload.fullNameHi.strip()
    if payload.title is not None:
        p_data["title"] = payload.title.strip()
    if payload.titleHi is not None:
        p_data["titleHi"] = payload.titleHi.strip()
    if payload.experienceYears is not None:
        p_data["experienceYears"] = payload.experienceYears
    if payload.schoolName is not None:
        p_data["schoolName"] = payload.schoolName.strip()
    if payload.department is not None:
        p_data["department"] = payload.department.strip()
    if payload.qualifications is not None:
        p_data["qualifications"] = payload.qualifications.strip()
    if payload.bio is not None:
        p_data["bio"] = payload.bio.strip()
    if payload.bioHi is not None:
        p_data["bioHi"] = payload.bioHi.strip()
    if payload.officeHours is not None:
        p_data["officeHours"] = payload.officeHours.strip()
    if payload.specializations is not None:
        p_data["specializations"] = payload.specializations
    if payload.avatarUrl is not None:
        p_data["avatarUrl"] = payload.avatarUrl

    if payload.age is not None:
        p_data["age"] = payload.age
    if payload.guardianName is not None:
        p_data["guardianName"] = payload.guardianName.strip()
    if payload.guardianRelation is not None:
        p_data["guardianRelation"] = payload.guardianRelation.strip()

    current_user.profile_data = p_data
    await session.commit()
    await session.refresh(current_user)

    role_name = (current_user.role.name if current_user.role else "teacher").lower()
    if role_name == "student":
        profile = await build_student_profile_dict(current_user, session)
        return {"type": "student", "profile": profile}

    profile = await build_teacher_profile_dict(current_user, session)
    return {"type": "teacher", "profile": profile}


@router.post("/setup-cohort", summary="Setup a live classroom cohort with enrolled students")
async def setup_cohort(
    _payload: SetupCohortRequest,
    _current_user: Annotated[User, Depends(require_role("teacher"))],
) -> dict[str, Any]:
    """Automatic enrollment of unrelated students is no longer supported."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Create a classroom and approve student join requests instead.",
    )


@router.get("/teachers", summary="List all educator profiles")
async def list_teacher_profiles(
    session: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_role("admin"))],
) -> list[dict[str, Any]]:
    """Retrieve list of distinct educator profiles from database."""
    role_res = await session.execute(select(Role).where(Role.name == "teacher"))
    teacher_role = role_res.scalar_one_or_none()
    if not teacher_role:
        return []

    stmt = (
        select(User)
        .options(selectinload(User.role))
        .where(
            User.role_id == teacher_role.id,
            User.is_deleted.is_(False),
        )
    )
    teachers = (await session.execute(stmt)).scalars().all()
    return [await build_teacher_profile_dict(t, session) for t in teachers]


@router.get("/teachers/{id_or_slug}", summary="Get teacher profile by ID or slug")
async def get_teacher_profile(
    id_or_slug: str,
    session: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_role("admin"))],
) -> dict[str, Any]:
    """Retrieve individual teacher profile from database."""
    query = id_or_slug.strip().lower()

    try:
        t_uuid = uuid.UUID(query)
        user_res = await session.execute(
            select(User).options(selectinload(User.role)).where(User.id == t_uuid)
        )
        user = user_res.scalar_one_or_none()
        if user:
            return await build_teacher_profile_dict(user, session)
    except ValueError:
        pass

    role_res = await session.execute(select(Role).where(Role.name == "teacher"))
    teacher_role = role_res.scalar_one_or_none()
    if teacher_role is None:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    stmt = (
        select(User)
        .options(selectinload(User.role))
        .where(
            User.role_id == teacher_role.id,
            (User.email.ilike(f"%{query}%"))
            | (User.username.ilike(f"%{query}%"))
            | (User.full_name.ilike(f"%{query}%")),
        )
        .limit(1)
    )
    user = (await session.execute(stmt)).scalar_one_or_none()
    if user:
        return await build_teacher_profile_dict(user, session)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")


@router.get("/students", summary="List all student profiles")
async def list_student_profiles(
    session: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_role("admin"))],
) -> list[dict[str, Any]]:
    """Retrieve list of student telemetry profiles from database."""
    role_res = await session.execute(select(Role).where(Role.name == "student"))
    student_role = role_res.scalar_one_or_none()
    if not student_role:
        return []

    stmt = (
        select(User)
        .options(selectinload(User.role))
        .where(
            User.role_id == student_role.id,
            User.is_deleted.is_(False),
        )
        .limit(30)
    )
    students = (await session.execute(stmt)).scalars().all()
    return [await build_student_profile_dict(s, session) for s in students]


@router.get("/students/{id_or_slug}", summary="Get distinct student profile")
async def get_student_profile(
    id_or_slug: str,
    session: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_role("admin"))],
) -> dict[str, Any]:
    """Retrieve individual student profile with distinct mastery, error patterns, and hint usage."""
    query = id_or_slug.strip().lower()

    try:
        s_uuid = uuid.UUID(query)
        user_res = await session.execute(
            select(User).options(selectinload(User.role)).where(User.id == s_uuid)
        )
        user = user_res.scalar_one_or_none()
        if user:
            return await build_student_profile_dict(user, session)
    except ValueError:
        pass

    role_res = await session.execute(select(Role).where(Role.name == "student"))
    student_role = role_res.scalar_one_or_none()
    if student_role is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    cleaned = query.replace("stu-", "").replace("-", "_")
    stmt = (
        select(User)
        .options(selectinload(User.role))
        .where(
            User.role_id == student_role.id,
            (User.username.ilike(f"%{cleaned}%")) | (User.full_name.ilike(f"%{query}%")),
        )
        .limit(1)
    )
    user = (await session.execute(stmt)).scalar_one_or_none()
    if user:
        return await build_student_profile_dict(user, session)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
