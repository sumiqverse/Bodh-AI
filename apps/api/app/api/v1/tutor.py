"""AI Tutor endpoints: Socratic resolution, vector ingestion, and cost budget monitoring."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.core.config import get_settings
from app.models.auth import User
from app.schemas.tutor import (
    TutorIngestRequest,
    TutorIngestResponse,
    TutorMonthlyBudgetResponse,
    TutorQueryRequest,
    TutorResponseSchema,
)
from app.services.tutor_ingestion import TutorIngestionService
from app.services.tutor_service import AITutorService

router = APIRouter(prefix="/tutor", tags=["ai-tutor"])


@router.post(
    "/ask",
    response_model=TutorResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Ask AI Socratic Tutor",
    description=(
        "Submit an educational question or misconception. "
        "Returns grounded explanation with safety and test-mode guardrails."
    ),
)
async def ask_tutor(
    request: TutorQueryRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TutorResponseSchema:
    """Resolve student query using RAG, PII scrubbing, injection defense, and Socratic guidance."""
    settings = get_settings()
    service = AITutorService(db, settings)
    return await service.answer_student_query(current_user.id, request)


@router.post(
    "/ingest",
    response_model=TutorIngestResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest Published Curriculum to Vector Store",
    description="Index teacher-approved published explanations and curriculum notes into pgvector.",
)
async def ingest_curriculum(
    request: TutorIngestRequest,
    _teacher_user: Annotated[User, Depends(require_role("teacher", "admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TutorIngestResponse:
    """Ingest only published, non-flagged questions and curriculum skills into vector database."""
    settings = get_settings()
    ingestion_service = TutorIngestionService(db, settings)
    return await ingestion_service.ingest_published_curriculum(
        curriculum_id=request.curriculum_id,
        force_reindex=request.force_reindex,
    )


@router.get(
    "/budget",
    response_model=TutorMonthlyBudgetResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Tutor Monthly Budget Status",
    description="Retrieve monthly token usage, expenditure, and budget alert status.",
)
async def get_tutor_budget(
    _teacher_user: Annotated[User, Depends(require_role("teacher", "admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TutorMonthlyBudgetResponse:
    """Return accumulated monthly token consumption and alert state."""
    settings = get_settings()
    service = AITutorService(db, settings)
    return await service.get_budget_status()
