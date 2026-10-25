"""Health check endpoint."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Response schema for the service health check."""

    status: str


@router.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """Return health status of the API."""
    return HealthResponse(status="ok")
