"""Offline-first client synchronization API v1 routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse
from app.services.sync_service import SyncService

router = APIRouter(prefix="/sync", tags=["Sync"])

DEFAULT_GUEST_STUDENT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.post("", response_model=SyncBatchResponse, summary="Batch Offline Sync")
async def sync_offline_events(
    batch: SyncBatchRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
    x_student_id: Annotated[
        uuid.UUID | None,
        Header(description="Authenticated student UUID or guest profile identifier"),
    ] = None,
) -> SyncBatchResponse:
    """Process queued offline events idempotently upon network reconnect."""
    student_id = x_student_id or DEFAULT_GUEST_STUDENT_ID
    service = SyncService(session)
    return await service.process_batch(student_id=student_id, batch=batch)
