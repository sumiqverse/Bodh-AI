"""System liveness and readiness probe routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.health import HealthResponse, ReadyResponse
from app.services.readiness_service import ReadinessService

router = APIRouter(tags=["System"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness Probe",
    description="Returns 200 OK if the FastAPI process is active and accepting requests.",
)
async def get_health() -> HealthResponse:
    """Liveness probe verifying that the application process is running."""
    settings = get_settings()
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version="0.1.0",
    )


@router.get(
    "/ready",
    response_model=ReadyResponse,
    summary="Readiness Probe",
    description="Probes PostgreSQL and Redis connections to verify operational readiness.",
    responses={
        200: {"description": "All backend dependencies are healthy and ready to serve traffic."},
        503: {"description": "One or more dependencies (PostgreSQL or Redis) are unavailable."},
    },
)
async def get_ready(
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ReadyResponse:
    """Readiness probe checking database and cache health."""
    ready_status = await ReadinessService.evaluate_readiness(session)
    if ready_status.status != "ready":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ready_status
