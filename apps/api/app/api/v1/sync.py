"""Offline-first client synchronization API v1 routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.models.auth import User
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse
from app.services.sync_service import SyncService

router = APIRouter(prefix="/sync", tags=["Sync"])


@router.post("", response_model=SyncBatchResponse, summary="Batch Offline Sync")
async def sync_offline_events(
    batch: SyncBatchRequest,
    current_user: Annotated[User, Depends(require_role("student", "teacher", "admin"))],
    session: Annotated[AsyncSession, Depends(get_db)],
    x_student_id: Annotated[
        uuid.UUID | None,
        Header(description="Authenticated student UUID or guest profile identifier"),
    ] = None,
) -> SyncBatchResponse:
    is_student = current_user.role.name == "student"
    student_id = current_user.id if is_student else (x_student_id or current_user.id)
    service = SyncService(session)
    return await service.process_batch(student_id=student_id, batch=batch)
