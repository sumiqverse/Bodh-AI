"""Administrator school analytics endpoints with zero student PII."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.models.auth import User
from app.repositories.class_repo import ClassRepository
from app.schemas.classes import AdminSchoolStatsResponse

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get(
    "/stats",
    response_model=AdminSchoolStatsResponse,
    summary="Fetch school-level aggregate statistics (zero student PII)",
)
async def get_admin_stats(
    _admin: Annotated[User, Depends(require_role("admin"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AdminSchoolStatsResponse:
    """Administrator view of system metrics: schools, classes, student counts, and mastery."""
    class_repo = ClassRepository(session)
    stats: dict[str, Any] = await class_repo.get_school_stats()

    return AdminSchoolStatsResponse(
        total_schools=int(stats["total_schools"]),
        total_classes=int(stats["total_classes"]),
        total_students=int(stats["total_students"]),
        total_attempts=int(stats["total_attempts"]),
        average_mastery=float(stats["average_mastery"]),
        grade_distribution=dict(stats["grade_distribution"]),
    )
