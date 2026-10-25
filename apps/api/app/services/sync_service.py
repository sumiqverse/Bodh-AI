"""Offline-first batch synchronization service."""

import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system import SyncEvent
from app.schemas.assessment import AttemptSubmitRequest
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse, SyncItemResult
from app.services.attempt_service import AttemptService

logger = structlog.get_logger(__name__)


class SyncService:
    """Service to process queued offline action events idempotently."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.attempt_service = AttemptService(session)

    async def process_batch(
        self,
        student_id: uuid.UUID,
        batch: SyncBatchRequest,
    ) -> SyncBatchResponse:
        """Process an ordered batch of offline sync events."""
        processed_count = 0
        failed_count = 0
        results: list[SyncItemResult] = []

        for item in batch.events:
            # Check duplicate sync event
            stmt = select(SyncEvent).where(SyncEvent.client_event_id == item.client_event_id)
            existing = (await self.session.execute(stmt)).scalar_one_or_none()
            if existing is not None:
                results.append(
                    SyncItemResult(
                        client_event_id=item.client_event_id,
                        status="duplicate",
                    )
                )
                continue

            try:
                if item.event_type == "attempt_submission":
                    attempt_req = AttemptSubmitRequest.model_validate(item.payload)
                    await self.attempt_service.submit_attempt(student_id, attempt_req)

                # Record sync event audit entry
                event_record = SyncEvent(
                    student_id=student_id,
                    client_event_id=item.client_event_id,
                    event_type=item.event_type,
                    payload=item.payload,
                    synced_at=datetime.now(UTC),
                    status="processed",
                )
                self.session.add(event_record)
                await self.session.flush()

                processed_count += 1
                results.append(
                    SyncItemResult(
                        client_event_id=item.client_event_id,
                        status="success",
                    )
                )
            except Exception as exc:
                logger.error(
                    "Sync item failure", client_event_id=item.client_event_id, error=str(exc)
                )
                failed_count += 1
                results.append(
                    SyncItemResult(
                        client_event_id=item.client_event_id,
                        status="failed",
                        error=str(exc),
                    )
                )

        return SyncBatchResponse(
            processed=processed_count,
            failed=failed_count,
            results=results,
        )
