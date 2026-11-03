"""Questions API v1 routes with strict student answer-leak protection and review workflow."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.core.errors import AuthorizationError, NotFoundError
from app.models.assessment import Question, QuestionTranslation, QuestionVersion
from app.models.auth import User
from app.models.organization import Enrollment, SchoolClass
from app.repositories.question_repo import QuestionRepository
from app.schemas.assessment import (
    QuestionDetailResponse,
    QuestionOptionResponse,
    QuestionResponse,
    QuestionStatusUpdateRequest,
    QuestionUpdateRequest,
)

router = APIRouter(prefix="/questions", tags=["Questions"])


def _user_is_educator(user: User) -> bool:
    """Determine if authenticated user possesses teacher or admin role privileges."""
    return bool(user.role and user.role.name in {"teacher", "admin"})


async def _class_access(session: AsyncSession, user: User, class_id: uuid.UUID) -> bool:
    if user.role and user.role.name == "admin":
        return True
    if user.role and user.role.name == "teacher":
        statement = select(SchoolClass.id).where(
            SchoolClass.id == class_id, SchoolClass.teacher_id == user.id
        )
    else:
        statement = select(Enrollment.id).where(
            Enrollment.class_id == class_id,
            Enrollment.student_id == user.id,
            Enrollment.status == "active",
        )
    return (await session.execute(statement)).scalar_one_or_none() is not None


async def _assert_question_access(session: AsyncSession, user: User, question: Question) -> None:
    if question.class_id is not None and not await _class_access(session, user, question.class_id):
        raise NotFoundError("Question", question.id)


def _assert_can_edit_shared_question(user: User, question: Question) -> None:
    if question.class_id is None and (not user.role or user.role.name != "admin"):
        raise AuthorizationError("Only administrators can modify shared curriculum questions.")


@router.get("", response_model=list[QuestionResponse], summary="List Questions for Skill")
async def list_questions(
    session: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_role("student", "teacher", "admin"))],
    skill_id: Annotated[uuid.UUID, Query(description="Skill competency UUID")],
    language: Annotated[str, Query(description="Language code ('en', 'hi')")] = "en",
    status_filter: Annotated[
        str | None,
        Query(
            alias="status",
            description="Status filter ('draft', 'reviewed', 'published') - Educators only",
        ),
    ] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    class_id: uuid.UUID | None = None,
) -> Sequence[QuestionResponse]:
    """Retrieve calibrated assessment questions belonging to a competency skill.

    SECURITY GUARANTEE:
    Students ONLY ever receive 'published' questions, and NEVER receive verified_answer,
    worked_solution, or correct option flags.
    """
    repo = QuestionRepository(session)
    if class_id is not None and not await _class_access(session, user, class_id):
        raise NotFoundError("Class", class_id)
    is_educator = _user_is_educator(user)

    # Students can only ever see published questions
    effective_status = status_filter if is_educator else "published"

    questions = await repo.list_by_skill(
        skill_id=skill_id,
        status=effective_status,
        skip=skip,
        limit=limit,
        class_id=class_id,
    )

    results: list[QuestionResponse] = []
    for q in questions:
        # Find matching language translation or fallback to first
        trans = next((t for t in q.translations if t.language == language), None)
        if trans is None and q.translations:
            trans = q.translations[0]

        if trans is None:
            continue

        # Stripping answers and correctness flags completely
        options = (
            [
                QuestionOptionResponse(
                    id=str(opt.get("id", "")),
                    text=str(opt.get("text", "")),
                )
                for opt in trans.options
            ]
            if trans.options
            else None
        )

        results.append(
            QuestionResponse(
                id=q.id,
                code=q.code or "",
                skill_id=q.skill_id,
                difficulty=q.difficulty,
                question_type=q.question_type,
                prompt=trans.prompt,
                options=options,
                hints=trans.hints or [],
            )
        )

    return results


@router.get(
    "/manage", response_model=list[QuestionDetailResponse], summary="List Questions for Management"
)
async def list_questions_for_management(
    session: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("teacher", "admin"))],
    skill_id: Annotated[uuid.UUID | None, Query(description="Filter by Skill UUID")] = None,
    status_filter: Annotated[
        str | None,
        Query(
            alias="status",
            description="Filter by status ('draft', 'reviewed', 'published')",
        ),
    ] = None,
    needs_review: Annotated[
        bool | None,
        Query(
            alias="needs_teacher_review",
            description="Filter by needs_teacher_review flag",
        ),
    ] = None,
    language: Annotated[str, Query(description="Preferred language ('en', 'hi')")] = "en",
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> Sequence[QuestionDetailResponse]:
    """Retrieve questions with full editorial review and solution metadata (Educators only)."""
    repo = QuestionRepository(session)
    questions = await repo.list_questions(
        skill_id=skill_id,
        status=status_filter,
        needs_teacher_review=needs_review,
        skip=skip,
        limit=limit,
        owner_id=_user.id if _user.role.name != "admin" else None,
    )

    results: list[QuestionDetailResponse] = []
    for q in questions:
        trans = next((t for t in q.translations if t.language == language), None)
        if trans is None and q.translations:
            trans = q.translations[0]

        if trans is None:
            continue

        results.append(
            QuestionDetailResponse(
                id=q.id,
                code=q.code or "",
                skill_id=q.skill_id,
                difficulty=q.difficulty,
                question_type=q.question_type,
                status=q.status,
                needs_teacher_review=q.needs_teacher_review,
                version=q.version,
                reviewer_id=q.reviewer_id,
                prompt=trans.prompt,
                options=trans.options,
                verified_answer=trans.verified_answer,
                worked_solution=trans.worked_solution,
                explanation=trans.explanation,
                hints=trans.hints or [],
                created_at=q.created_at,
                updated_at=q.updated_at,
            )
        )

    return results


@router.get(
    "/{question_id}", response_model=QuestionResponse, summary="Get Question by ID (Student View)"
)
async def get_question(
    question_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_role("student", "teacher", "admin"))],
    language: Annotated[str, Query(description="Language code ('en', 'hi')")] = "en",
) -> QuestionResponse:
    """Retrieve a single calibrated question by UUID.

    SECURITY GUARANTEE:
    If caller is a student, question must be in 'published' state and answer data is excluded.
    """
    repo = QuestionRepository(session)
    question = await repo.get_with_translations(question_id)
    if question is None:
        raise NotFoundError("Question", question_id)
    await _assert_question_access(session, user, question)

    # Students can never access un-published questions
    if not _user_is_educator(user) and question.status != "published":
        raise NotFoundError("Question", question_id)

    trans = next((t for t in question.translations if t.language == language), None)
    if trans is None and question.translations:
        trans = question.translations[0]

    if trans is None:
        raise NotFoundError("QuestionTranslation", f"{question_id}:{language}")

    options = (
        [
            QuestionOptionResponse(
                id=str(opt.get("id", "")),
                text=str(opt.get("text", "")),
            )
            for opt in trans.options
        ]
        if trans.options
        else None
    )

    return QuestionResponse(
        id=question.id,
        code=question.code or "",
        skill_id=question.skill_id,
        difficulty=question.difficulty,
        question_type=question.question_type,
        prompt=trans.prompt,
        options=options,
        hints=trans.hints or [],
    )


@router.get(
    "/{question_id}/detail",
    response_model=QuestionDetailResponse,
    summary="Get Question Details (Educator View)",
)
async def get_question_detail(
    question_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("teacher", "admin"))],
    language: Annotated[str, Query(description="Language code ('en', 'hi')")] = "en",
) -> QuestionDetailResponse:
    """Retrieve complete question details including verified answers, options, and solutions."""
    repo = QuestionRepository(session)
    question = await repo.get_with_translations(question_id)
    if question is None:
        raise NotFoundError("Question", question_id)
    await _assert_question_access(session, _user, question)

    trans = next((t for t in question.translations if t.language == language), None)
    if trans is None and question.translations:
        trans = question.translations[0]

    if trans is None:
        raise NotFoundError("QuestionTranslation", f"{question_id}:{language}")

    return QuestionDetailResponse(
        id=question.id,
        code=question.code or "",
        skill_id=question.skill_id,
        difficulty=question.difficulty,
        question_type=question.question_type,
        status=question.status,
        needs_teacher_review=question.needs_teacher_review,
        version=question.version,
        reviewer_id=question.reviewer_id,
        prompt=trans.prompt,
        options=trans.options,
        verified_answer=trans.verified_answer,
        worked_solution=trans.worked_solution,
        explanation=trans.explanation,
        hints=trans.hints or [],
        created_at=question.created_at,
        updated_at=question.updated_at,
    )


@router.put(
    "/{question_id}/status",
    response_model=QuestionDetailResponse,
    summary="Update Question Review Status",
)
async def update_question_status(
    question_id: uuid.UUID,
    body: QuestionStatusUpdateRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_role("teacher", "admin"))],
    language: Annotated[str, Query(description="Response language")] = "en",
) -> QuestionDetailResponse:
    """Transition question editorial status (draft -> reviewed -> published).

    Records the reviewer UUID and adds an immutable snapshot to question version history.
    """
    repo = QuestionRepository(session)
    question = await repo.get_with_translations(question_id)
    if question is None:
        raise NotFoundError("Question", question_id)
    await _assert_question_access(session, user, question)
    _assert_can_edit_shared_question(user, question)

    old_status = question.status
    new_status = body.status

    # Validate transition
    valid_transitions = {
        "draft": {"draft", "reviewed", "published"},
        "reviewed": {"draft", "reviewed", "published"},
        "published": {"draft", "reviewed", "published"},
    }
    if new_status not in valid_transitions.get(old_status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{old_status}' to '{new_status}'",
        )

    question.status = new_status
    question.reviewer_id = user.id

    if body.needs_teacher_review is not None:
        question.needs_teacher_review = body.needs_teacher_review
    elif new_status == "published":
        question.needs_teacher_review = False

    question.version += 1

    # Record snapshot in QuestionVersion
    snapshot = {
        "code": question.code,
        "difficulty": question.difficulty,
        "question_type": question.question_type,
        "status": question.status,
        "reviewer_id": str(user.id),
        "translations": [
            {
                "language": t.language,
                "prompt": t.prompt,
                "options": t.options,
                "verified_answer": t.verified_answer,
                "worked_solution": t.worked_solution,
                "explanation": t.explanation,
                "hints": t.hints,
            }
            for t in question.translations
        ],
    }
    version_entry = QuestionVersion(
        question_id=question.id,
        version_number=question.version,
        status=question.status,
        snapshot=snapshot,
        changed_by_id=user.id,
        change_reason=f"Status changed from {old_status} to {new_status}",
    )
    session.add(version_entry)

    trans = next((t for t in question.translations if t.language == language), None)
    if trans is None and question.translations:
        trans = question.translations[0]

    resp = QuestionDetailResponse(
        id=question.id,
        code=question.code or "",
        skill_id=question.skill_id,
        difficulty=question.difficulty,
        question_type=question.question_type,
        status=question.status,
        needs_teacher_review=question.needs_teacher_review,
        version=question.version,
        reviewer_id=question.reviewer_id,
        prompt=trans.prompt if trans else "",
        options=trans.options if trans else None,
        verified_answer=trans.verified_answer if trans else "",
        worked_solution=trans.worked_solution if trans else "",
        explanation=trans.explanation if trans else None,
        hints=trans.hints if trans else [],
        created_at=question.created_at,
        updated_at=question.updated_at,
    )

    await session.flush()
    return resp


@router.put(
    "/{question_id}",
    response_model=QuestionDetailResponse,
    summary="Update Question Content (Editor)",
)
async def update_question(
    question_id: uuid.UUID,
    body: QuestionUpdateRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_role("teacher", "admin"))],
) -> QuestionDetailResponse:
    """Update question prompt, options, solution, and difficulty (Educators only)."""
    repo = QuestionRepository(session)
    question = await repo.get_with_translations(question_id)
    if question is None:
        raise NotFoundError("Question", question_id)
    await _assert_question_access(session, user, question)
    _assert_can_edit_shared_question(user, question)

    if body.difficulty is not None:
        question.difficulty = body.difficulty
    if body.question_type is not None:
        question.question_type = body.question_type
    if body.needs_teacher_review is not None:
        question.needs_teacher_review = body.needs_teacher_review

    # Update or add translation
    trans = next((t for t in question.translations if t.language == body.language), None)
    if trans is None:
        trans = QuestionTranslation(
            question_id=question.id,
            language=body.language,
            prompt=body.prompt or "",
            options=body.options,
            verified_answer=body.verified_answer or "",
            worked_solution=body.worked_solution or "",
            explanation=body.explanation or "",
            hints=body.hints or [],
        )
        session.add(trans)
        question.translations.append(trans)
    else:
        if body.prompt is not None:
            trans.prompt = body.prompt
        if body.options is not None:
            trans.options = body.options
        if body.verified_answer is not None:
            trans.verified_answer = body.verified_answer
        if body.worked_solution is not None:
            trans.worked_solution = body.worked_solution
        if body.explanation is not None:
            trans.explanation = body.explanation
        if body.hints is not None:
            trans.hints = body.hints

    question.version += 1
    snapshot = {
        "code": question.code,
        "difficulty": question.difficulty,
        "question_type": question.question_type,
        "status": question.status,
        "changed_by": str(user.id),
        "translations": [
            {
                "language": t.language,
                "prompt": t.prompt,
                "options": t.options,
                "verified_answer": t.verified_answer,
                "worked_solution": t.worked_solution,
                "explanation": t.explanation,
                "hints": t.hints,
            }
            for t in question.translations
        ],
    }
    version_entry = QuestionVersion(
        question_id=question.id,
        version_number=question.version,
        status=question.status,
        snapshot=snapshot,
        changed_by_id=user.id,
        change_reason="Content edited via Question Editor",
    )
    session.add(version_entry)

    resp = QuestionDetailResponse(
        id=question.id,
        code=question.code or "",
        skill_id=question.skill_id,
        difficulty=question.difficulty,
        question_type=question.question_type,
        status=question.status,
        needs_teacher_review=question.needs_teacher_review,
        version=question.version,
        reviewer_id=question.reviewer_id,
        prompt=trans.prompt,
        options=trans.options,
        verified_answer=trans.verified_answer,
        worked_solution=trans.worked_solution,
        explanation=trans.explanation,
        hints=trans.hints or [],
        created_at=question.created_at,
        updated_at=question.updated_at,
    )

    await session.flush()
    return resp
