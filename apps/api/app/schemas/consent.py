"""Consent schemas for DPDP Act compliance."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ConsentCreateRequest(BaseModel):
    """Parental/student consent registration payload."""

    scope: str = Field(
        description="Consent scope, e.g. 'diagnostic', 'learning', 'data_sharing', 'offline_sync'",
    )
    version: str = Field(default="2024.1", description="Policy version consented to")
    guardian_id: uuid.UUID | None = Field(
        default=None, description="Guardian UUID if student is minor"
    )


class ConsentResponse(BaseModel):
    """Consent status confirmation."""

    id: uuid.UUID
    student_id: uuid.UUID
    scope: str
    version: str
    is_granted: bool
    timestamp: datetime
    revoked_at: datetime | None = None
