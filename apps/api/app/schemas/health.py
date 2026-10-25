"""Health and readiness response schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Liveness probe status payload."""

    status: Literal["ok"] = Field(default="ok", description="Liveness confirmation flag")
    app: str = Field(description="Name of the running application service")
    version: str = Field(description="Semantic version string")


class ReadyResponse(BaseModel):
    """Readiness probe status payload indicating database and cache health."""

    status: Literal["ready", "degraded"] = Field(description="Operational readiness state")
    database: bool = Field(description="Whether the PostgreSQL connection probe succeeded")
    redis: bool = Field(description="Whether the Redis connection probe succeeded")
    timestamp: datetime = Field(description="UTC timestamp of readiness evaluation")
