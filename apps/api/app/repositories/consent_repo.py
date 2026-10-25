"""Consent repository compliant with DPDP Act 2023."""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Consent
from app.repositories.base import BaseRepository


class ConsentRepository(BaseRepository[Consent]):
    """Repository operations for parental and student consent tracking."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Consent, session)

    async def get_active_consents(self, student_id: uuid.UUID) -> Sequence[Consent]:
        """Fetch all currently active granted consents for a student."""
        statement = select(Consent).where(
            Consent.student_id == student_id,
            Consent.is_granted == True,  # noqa: E712
            Consent.revoked_at.is_(None),
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def has_consent(self, student_id: uuid.UUID, scope: str) -> bool:
        """Verify whether a student has an active granted consent for a specific scope."""
        statement = select(Consent).where(
            Consent.student_id == student_id,
            Consent.scope == scope,
            Consent.is_granted == True,  # noqa: E712
            Consent.revoked_at.is_(None),
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none() is not None

    async def grant_consent(
        self,
        student_id: uuid.UUID,
        scope: str,
        version: str = "2024.1",
        guardian_id: uuid.UUID | None = None,
        ip_address: str | None = None,
    ) -> Consent:
        """Record newly granted consent."""
        consent = Consent(
            student_id=student_id,
            guardian_id=guardian_id,
            scope=scope,
            version=version,
            timestamp=datetime.now(UTC),
            is_granted=True,
            ip_address=ip_address,
        )
        self.session.add(consent)
        await self.session.flush()
        return consent

    async def revoke_consent(self, consent_id: uuid.UUID) -> Consent | None:
        """Revoke a previously granted consent."""
        consent = await self.get_by_id(consent_id)
        if consent is not None:
            consent.is_granted = False
            consent.revoked_at = datetime.now(UTC)
            await self.session.flush()
        return consent
