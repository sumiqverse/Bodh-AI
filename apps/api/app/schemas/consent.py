"""Consent schemas for DPDP Act compliance."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ConsentCreateRequest(BaseModel):
    """Parental/student consent registration payload."""

    scope: str = Field(
        description="Consent scope, e.g. 'diagnostic', 'learning', 'data_sharing', 'offline_sync'",
    )
    version: str = Field(default="2026.1", description="Policy version consented to")
    guardian_id: uuid.UUID | None = Field(
        default=None, description="Guardian UUID if student is minor"
    )


class GuardianConsentCreateRequest(BaseModel):
    """Guardian verifiable consent submission under DPDP Act 2023."""

    student_id: uuid.UUID | None = None
    guardian_name: str = Field(min_length=2, max_length=150)
    guardian_phone: str = Field(min_length=8, max_length=20)
    guardian_relationship: str = Field(
        default="Parent",
        description="e.g. 'Mother', 'Father', 'Legal Guardian'",
    )
    scopes: list[str] = Field(
        default=["diagnostic", "learning", "data_sharing"],
        description="List of consented processing scopes",
    )
    version: str = Field(default="2026.1", description="DPDP notice version")


class ConsentWithdrawRequest(BaseModel):
    """Payload to withdraw granted consents under DPDP rights."""

    student_id: uuid.UUID | None = None
    scope: str | None = Field(
        default=None,
        description="Specific scope to withdraw, or null to withdraw all scopes",
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


class ConsentDetailResponse(BaseModel):
    """Comprehensive consent record including guardian information."""

    id: uuid.UUID
    student_id: uuid.UUID
    scope: str
    version: str
    is_granted: bool
    timestamp: datetime
    revoked_at: datetime | None = None
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_relationship: str | None = None
