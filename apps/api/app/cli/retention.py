"""CLI command handler for DPDP Act retention and data deletion jobs."""

from __future__ import annotations

import argparse
import asyncio

from app.db.session import get_session_factory
from app.services.retention_service import RetentionService


async def _run_retention_purge(
    grace_period_days: int,
    tutor_days: int,
    sync_days: int,
) -> int:
    """Run all retention and storage limitation purge jobs."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        service = RetentionService(session)
        summary = await service.run_all_retention_jobs(
            grace_period_days=grace_period_days,
            tutor_retention_days=tutor_days,
            sync_retention_days=sync_days,
        )
        await session.commit()

    print("\n[OK] BodhAI DPDP Retention & Deletion Job Completed Successfully:")
    print(f"   - Expired sessions purged:       {summary['expired_sessions_purged']}")
    print(f"   - Soft-deleted users scrubbed:   {summary['soft_deleted_users_scrubbed']}")
    print(f"   - Stale tutor logs pruned:       {summary['tutor_logs_pruned']}")
    print(f"   - Stale sync queue items pruned: {summary['sync_events_pruned']}\n")
    return 0


def handle_retention_purge(args: argparse.Namespace) -> int:
    """Synchronous entrypoint for retention CLI purge command."""
    return asyncio.run(
        _run_retention_purge(
            grace_period_days=args.grace_days,
            tutor_days=args.tutor_days,
            sync_days=args.sync_days,
        )
    )
