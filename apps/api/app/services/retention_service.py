"""DPDP Act 2023 compliance retention and data deletion jobs."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import CursorResult, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import Session as UserSession
from app.models.auth import User
from app.models.system import SyncEvent
from app.models.tutor import TutorInteractionLog
from app.repositories.audit_repo import AuditRepository

logger = structlog.get_logger(__name__)


class RetentionService:
    """Automated storage limitation, session purge, and DPDP erasure service."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.audit_repo = AuditRepository(session)

    async def purge_expired_sessions(self, reference_time: datetime | None = None) -> int:
        """Purge authenticated user sessions that are expired or revoked."""
        now = reference_time or datetime.now(UTC)
        stmt = delete(UserSession).where(
            (UserSession.expires_at < now) | (UserSession.is_revoked == True)  # noqa: E712
        )
        result = await self.session.execute(stmt)
        purged_count = int(result.rowcount) if isinstance(result, CursorResult) else 0
        logger.info("Purged expired or revoked user sessions", count=purged_count)
        return purged_count

    async def purge_soft_deleted_users(
        self,
        grace_period_days: int = 30,
        reference_time: datetime | None = None,
    ) -> int:
        """Permanently anonymize and scrub residual identifiers for users soft-deleted
        past grace period.
        """
        now = reference_time or datetime.now(UTC)
        cutoff = now - timedelta(days=grace_period_days)

        stmt = select(User).where(
            User.is_deleted == True,  # noqa: E712
            User.deleted_at.is_not(None),
            User.deleted_at < cutoff,
        )
        res = await self.session.execute(stmt)
        users_to_purge = res.scalars().all()

        count = 0
        for user in users_to_purge:
            # Erase any residual identifiers permanently
            user.email = None
            user.phone = None
            user.full_name = "Anonymized Student (DPDP Purged)"
            user.username = f"anon_purged_{uuid.uuid4().hex[:8]}"
            user.hashed_password = None
            user.pin_hash = None
            user.is_active = False

            # Delete associated sessions
            await self.session.execute(delete(UserSession).where(UserSession.user_id == user.id))
            count += 1

        logger.info("Permanently scrubbed soft-deleted users past retention window", count=count)
        return count

    async def prune_tutor_logs(
        self,
        retention_days: int = 90,
        reference_time: datetime | None = None,
    ) -> int:
        """Prune student AI tutor interaction logs older than the statutory retention threshold."""
        now = reference_time or datetime.now(UTC)
        cutoff = now - timedelta(days=retention_days)

        stmt = delete(TutorInteractionLog).where(TutorInteractionLog.created_at < cutoff)
        result = await self.session.execute(stmt)
        count = int(result.rowcount) if isinstance(result, CursorResult) else 0
        logger.info(
            "Pruned AI tutor logs older than retention period", count=count, days=retention_days
        )
        return count

    async def prune_sync_events(
        self,
        retention_days: int = 30,
        reference_time: datetime | None = None,
    ) -> int:
        """Prune successfully processed offline synchronization queue records older than
        retention threshold.
        """
        now = reference_time or datetime.now(UTC)
        cutoff = now - timedelta(days=retention_days)

        stmt = delete(SyncEvent).where(
            SyncEvent.created_at < cutoff,
            SyncEvent.status == "processed",
        )
        result = await self.session.execute(stmt)
        count = int(result.rowcount) if isinstance(result, CursorResult) else 0
        logger.info("Pruned processed offline sync events", count=count, days=retention_days)
        return count

    async def run_all_retention_jobs(
        self,
        session_reference_time: datetime | None = None,
        grace_period_days: int = 30,
        tutor_retention_days: int = 90,
        sync_retention_days: int = 30,
    ) -> dict[str, int]:
        """Execute all DPDP Act retention and deletion maintenance jobs."""
        sessions_purged = await self.purge_expired_sessions(reference_time=session_reference_time)
        users_scrubbed = await self.purge_soft_deleted_users(
            grace_period_days=grace_period_days,
            reference_time=session_reference_time,
        )
        tutor_logs_pruned = await self.prune_tutor_logs(
            retention_days=tutor_retention_days,
            reference_time=session_reference_time,
        )
        sync_events_pruned = await self.prune_sync_events(
            retention_days=sync_retention_days,
            reference_time=session_reference_time,
        )

        summary = {
            "expired_sessions_purged": sessions_purged,
            "soft_deleted_users_scrubbed": users_scrubbed,
            "tutor_logs_pruned": tutor_logs_pruned,
            "sync_events_pruned": sync_events_pruned,
        }

        await self.audit_repo.log_action(
            action="retention_cleanup",
            resource_type="system",
            resource_id="maintenance_job",
            changes=summary,
        )

        return summary
