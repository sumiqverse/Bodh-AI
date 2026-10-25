"""Schemas for DPDP Data Principal Rights (data export and erasure)."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class StudentDataExportResponse(BaseModel):
    """Complete portable JSON data export for a student."""

    student_id: uuid.UUID
    exported_at: datetime
    profile: dict[str, Any]
    guardian: dict[str, Any] | None
    consents: list[dict[str, Any]]
    enrollments: list[dict[str, Any]]
    attempts: list[dict[str, Any]]
    mastery: list[dict[str, Any]]


class DataDeleteResponse(BaseModel):
    """Confirmation of student account anonymization and data erasure."""

    student_id: uuid.UUID
    status: str
    message: str
    anonymized_at: datetime
