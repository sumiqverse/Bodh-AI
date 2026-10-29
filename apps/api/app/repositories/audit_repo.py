"""Audit log repository for immutable security, compliance, and DPDP tracking."""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system import AuditLog
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    """Repository operations for immutable security audit logs."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(AuditLog, session)

    async def log_action(
        self,
        action: str,
        resource_type: str,
        resource_id: str,
        changes: dict[str, Any] | None = None,
        user_id: uuid.UUID | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        """Persist an immutable audit log record."""
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            changes=changes or {},
            ip_address=ip_address,
        )
        self.session.add(audit_entry)
        await self.session.flush()
        return audit_entry

    async def get_audit_logs(
        self,
        action: str | None = None,
        resource_type: str | None = None,
        user_id: uuid.UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[int, list[AuditLog]]:
        """Retrieve paginated audit logs with optional filters."""
        from sqlalchemy import func, select

        conditions = []
        if action:
            conditions.append(AuditLog.action == action)
        if resource_type:
            conditions.append(AuditLog.resource_type == resource_type)
        if user_id:
            conditions.append(AuditLog.user_id == user_id)

        count_stmt = select(func.count(AuditLog.id))
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total_res = await self.session.execute(count_stmt)
        total = int(total_res.scalar() or 0)

        query_stmt = select(AuditLog)
        if conditions:
            query_stmt = query_stmt.where(*conditions)
        query_stmt = query_stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)

        res = await self.session.execute(query_stmt)
        return total, list(res.scalars().all())
