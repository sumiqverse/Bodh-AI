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
