"""Tests for DPDP Act 2023 data retention and automated deletion jobs."""

import argparse
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cli.retention import handle_retention_purge
from app.models.auth import Role, User
from app.models.auth import Session as UserSession
from app.models.system import AuditLog, SyncEvent
from app.models.tutor import TutorInteractionLog
from app.services.retention_service import RetentionService


@pytest.mark.asyncio
async def test_purge_expired_sessions(db_session: AsyncSession) -> None:
    """Ensure expired and revoked sessions are purged while active valid sessions persist."""
    # 1. Setup role & user
    role = Role(name=f"student_{uuid.uuid4().hex[:6]}", description="Student", permissions=[])
    db_session.add(role)
    await db_session.flush()

    user = User(
        full_name="Test Student",
        username=f"student_{uuid.uuid4().hex[:6]}",
        role_id=role.id,
    )
    db_session.add(user)
    await db_session.flush()

    now = datetime.now(UTC)

    # Active session (expires in 1 hour)
    active_session = UserSession(
        user_id=user.id,
        token_hash=f"active_{uuid.uuid4().hex}",
        expires_at=now + timedelta(hours=1),
        is_revoked=False,
    )
    # Expired session (expired 1 hour ago)
    expired_session = UserSession(
        user_id=user.id,
        token_hash=f"expired_{uuid.uuid4().hex}",
        expires_at=now - timedelta(hours=1),
        is_revoked=False,
    )
    # Revoked session (not expired, but revoked)
    revoked_session = UserSession(
        user_id=user.id,
        token_hash=f"revoked_{uuid.uuid4().hex}",
        expires_at=now + timedelta(hours=1),
        is_revoked=True,
    )

    db_session.add_all([active_session, expired_session, revoked_session])
    await db_session.commit()

    # Execute purge
    service = RetentionService(db_session)
    purged_count = await service.purge_expired_sessions(reference_time=now)
    await db_session.commit()

    assert purged_count >= 2

    # Verify active session still exists
    stmt = select(UserSession).where(UserSession.id == active_session.id)
    res = await db_session.execute(stmt)
    assert res.scalar_one_or_none() is not None

    # Verify expired and revoked sessions are deleted
    stmt2 = select(UserSession).where(UserSession.id.in_([expired_session.id, revoked_session.id]))
    res2 = await db_session.execute(stmt2)
    assert len(res2.scalars().all()) == 0


@pytest.mark.asyncio
async def test_purge_soft_deleted_users(db_session: AsyncSession) -> None:
    """Ensure users deleted past grace period have all residual identifiers scrubbed."""
    role = Role(name=f"student_{uuid.uuid4().hex[:6]}", description="Student", permissions=[])
    db_session.add(role)
    await db_session.flush()

    now = datetime.now(UTC)

    # 1. User deleted 40 days ago (> 30 day grace period)
    stale_deleted_user = User(
        full_name="Old Deleted Student",
        username=f"deleted_old_{uuid.uuid4().hex[:6]}",
        email="old_deleted@school.edu.in",
        phone="9876543210",
        role_id=role.id,
        is_deleted=True,
        deleted_at=now - timedelta(days=40),
    )
    # 2. User deleted 5 days ago (< 30 day grace period)
    recent_deleted_user = User(
        full_name="Recent Deleted Student",
        username=f"deleted_recent_{uuid.uuid4().hex[:6]}",
        email="recent_deleted@school.edu.in",
        phone="9876543211",
        role_id=role.id,
        is_deleted=True,
        deleted_at=now - timedelta(days=5),
    )

    db_session.add_all([stale_deleted_user, recent_deleted_user])
    await db_session.commit()

    service = RetentionService(db_session)
    purged_count = await service.purge_soft_deleted_users(grace_period_days=30, reference_time=now)
    await db_session.commit()

    assert purged_count >= 1

    # Stale deleted user should be permanently anonymized
    await db_session.refresh(stale_deleted_user)
    assert stale_deleted_user.email is None
    assert stale_deleted_user.phone is None
    assert "Anonymized Student" in stale_deleted_user.full_name
    assert stale_deleted_user.is_active is False

    # Recently deleted user should preserve grace period data
    await db_session.refresh(recent_deleted_user)
    assert recent_deleted_user.email == "recent_deleted@school.edu.in"


@pytest.mark.asyncio
async def test_prune_tutor_logs(db_session: AsyncSession) -> None:
    """Ensure student AI tutor interaction logs older than retention period are deleted."""
    role = Role(name=f"student_{uuid.uuid4().hex[:6]}", description="Student", permissions=[])
    db_session.add(role)
    await db_session.flush()

    user = User(
        full_name="Tutor Student",
        username=f"tutor_{uuid.uuid4().hex[:6]}",
        role_id=role.id,
    )
    db_session.add(user)
    await db_session.flush()

    now = datetime.now(UTC)

    skill_id = uuid.uuid4()

    # Log 100 days old (> 90 day limit)
    old_log = TutorInteractionLog(
        student_id=user.id,
        skill_id=skill_id,
        query_scrubbed="Explain fractions",
        response_text="Fractions represent equal parts of a whole.",
        tokens_used=50,
        cost_usd=0.0001,
        created_at=now - timedelta(days=100),
    )
    # Log 10 days old (< 90 day limit)
    recent_log = TutorInteractionLog(
        student_id=user.id,
        skill_id=skill_id,
        query_scrubbed="What is an integer?",
        response_text="An integer is a whole number.",
        tokens_used=40,
        cost_usd=0.0001,
        created_at=now - timedelta(days=10),
    )

    db_session.add_all([old_log, recent_log])
    await db_session.commit()

    service = RetentionService(db_session)
    pruned_count = await service.prune_tutor_logs(retention_days=90, reference_time=now)
    await db_session.commit()

    assert pruned_count >= 1

    stmt = select(TutorInteractionLog).where(TutorInteractionLog.id == recent_log.id)
    res = await db_session.execute(stmt)
    assert res.scalar_one_or_none() is not None

    stmt_old = select(TutorInteractionLog).where(TutorInteractionLog.id == old_log.id)
    res_old = await db_session.execute(stmt_old)
    assert res_old.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_prune_sync_events(db_session: AsyncSession) -> None:
    """Ensure processed offline sync items older than 30 days are purged."""
    role = Role(name=f"student_{uuid.uuid4().hex[:6]}", description="Student", permissions=[])
    db_session.add(role)
    await db_session.flush()

    user = User(
        full_name="Sync Student",
        username=f"sync_{uuid.uuid4().hex[:6]}",
        role_id=role.id,
    )
    db_session.add(user)
    await db_session.flush()

    now = datetime.now(UTC)

    # 1. Processed sync event 45 days old (> 30 days)
    old_sync = SyncEvent(
        student_id=user.id,
        client_event_id=f"client_old_{uuid.uuid4().hex[:8]}",
        event_type="attempt_submitted",
        payload={"is_correct": True},
        synced_at=now - timedelta(days=45),
        status="processed",
        created_at=now - timedelta(days=45),
    )
    # 2. Processed sync event 5 days old (< 30 days)
    recent_sync = SyncEvent(
        student_id=user.id,
        client_event_id=f"client_recent_{uuid.uuid4().hex[:8]}",
        event_type="attempt_submitted",
        payload={"is_correct": True},
        synced_at=now - timedelta(days=5),
        status="processed",
        created_at=now - timedelta(days=5),
    )

    db_session.add_all([old_sync, recent_sync])
    await db_session.commit()

    service = RetentionService(db_session)
    pruned_count = await service.prune_sync_events(retention_days=30, reference_time=now)
    await db_session.commit()

    assert pruned_count >= 1

    stmt = select(SyncEvent).where(SyncEvent.id == recent_sync.id)
    res = await db_session.execute(stmt)
    assert res.scalar_one_or_none() is not None

    stmt_old = select(SyncEvent).where(SyncEvent.id == old_sync.id)
    res_old = await db_session.execute(stmt_old)
    assert res_old.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_run_all_retention_jobs(db_session: AsyncSession) -> None:
    """Ensure run_all_retention_jobs coordinates all purges and logs an audit log entry."""
    service = RetentionService(db_session)
    summary = await service.run_all_retention_jobs()
    await db_session.commit()

    assert "expired_sessions_purged" in summary
    assert "soft_deleted_users_scrubbed" in summary
    assert "tutor_logs_pruned" in summary
    assert "sync_events_pruned" in summary

    # Verify audit log entry
    stmt = (
        select(AuditLog)
        .where(AuditLog.action == "retention_cleanup")
        .order_by(AuditLog.created_at.desc())
    )
    res = await db_session.execute(stmt)
    audit_entry = res.scalars().first()
    assert audit_entry is not None
    assert audit_entry.resource_type == "system"


def test_cli_retention_purge() -> None:
    """Ensure CLI handler parses and delegates to retention purge routine."""
    from unittest.mock import AsyncMock, patch

    args = argparse.Namespace(grace_days=30, tutor_days=90, sync_days=30)
    with patch("app.cli.retention._run_retention_purge", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = 0
        exit_code = handle_retention_purge(args)
        assert exit_code == 0
        mock_run.assert_called_once_with(
            grace_period_days=30,
            tutor_days=90,
            sync_days=30,
        )


@pytest.mark.asyncio
async def test_run_retention_purge_routine(db_session: AsyncSession) -> None:
    """Ensure _run_retention_purge executes end-to-end and outputs summary."""
    from unittest.mock import patch

    from app.cli.retention import _run_retention_purge

    class DummyContext:
        def __init__(self, s: AsyncSession):
            self.s = s

        async def __aenter__(self) -> AsyncSession:
            return self.s

        async def __aexit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
            pass

    def dummy_factory() -> DummyContext:
        return DummyContext(db_session)

    with patch("app.cli.retention.get_session_factory", return_value=dummy_factory):
        exit_code = await _run_retention_purge(grace_period_days=30, tutor_days=90, sync_days=30)
        assert exit_code == 0
