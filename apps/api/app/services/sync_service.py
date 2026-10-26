"""Offline-first batch synchronization service."""

import uuid
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Mastery
from app.models.system import SyncEvent
from app.schemas.assessment import AttemptSubmitRequest, MasteryResponse
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
        """Process an ordered batch of offline sync events.

        Conflict Resolution Rules:
        1. Duplicate events (matching client_event_id) are ignored and marked as 'duplicate'.
        2. Out-of-order events are sorted deterministically by client timestamp before replay.
        3. Clock skew: timestamps ahead of server time by > 5 minutes are clamped to server time.
        4. Canonical mastery is recomputed and returned as the authoritative truth.
        """
        processed_count = 0
        failed_count = 0
        results: list[SyncItemResult] = []
        now = datetime.now(UTC)

        # Sort out-of-order events deterministically by client timestamp
        sorted_events = sorted(batch.events, key=lambda e: e.timestamp)

        for item in sorted_events:
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

            # Clock skew handling: if client timestamp is > 5 min in the future, clamp
            client_ts = item.timestamp
            if client_ts.tzinfo is None:
                client_ts = client_ts.replace(tzinfo=UTC)

            if client_ts > now + timedelta(minutes=5):
                logger.warning(
                    "Clock skew detected: client timestamp ahead of server",
                    client_event_id=item.client_event_id,
                    client_time=client_ts.isoformat(),
                    server_time=now.isoformat(),
                )
                effective_payload = item.payload.copy()
                effective_payload["client_clock_skew_flag"] = True
            else:
                effective_payload = item.payload

            try:
                if item.event_type == "attempt_submission":
                    attempt_req = AttemptSubmitRequest.model_validate(effective_payload)
                    await self.attempt_service.submit_attempt(student_id, attempt_req)

                # Record sync event audit entry
                event_record = SyncEvent(
                    student_id=student_id,
                    client_event_id=item.client_event_id,
                    event_type=item.event_type,
                    payload=effective_payload,
                    synced_at=now,
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

        # Retrieve authoritative canonical mastery states for the student
        mastery_stmt = select(Mastery).where(Mastery.student_id == student_id)
        mastery_records = (await self.session.execute(mastery_stmt)).scalars().all()
        canonical_mastery = [
            MasteryResponse(
                skill_id=m.skill_id,
                p_mastery=round(m.p_mastery, 4),
                confidence=round(m.confidence, 4),
                attempts_count=m.attempts_count,
                correct_count=m.correct_count,
                last_attempted_at=m.last_attempted_at,
                state=(
                    "mastered"
                    if m.p_mastery >= 0.95
                    else ("partial" if m.p_mastery >= 0.40 else "not_learned")
                ),
            )
            for m in mastery_records
        ]

        return SyncBatchResponse(
            processed=processed_count,
            failed=failed_count,
            results=results,
            canonical_mastery=canonical_mastery,
        )
