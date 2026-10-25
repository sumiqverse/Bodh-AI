"""Consent repository compliant with DPDP Act 2023."""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.organization import Consent, Guardian
from app.repositories.base import BaseRepository


class ConsentRepository(BaseRepository[Consent]):
    """Repository operations for parental and student consent tracking."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Consent, session)

    async def get_active_consents(self, student_id: uuid.UUID) -> Sequence[Consent]:
        """Fetch all currently active granted consents for a student."""
        statement = (
            select(Consent)
            .options(selectinload(Consent.guardian))
            .where(
                Consent.student_id == student_id,
                Consent.is_granted == True,  # noqa: E712
                Consent.revoked_at.is_(None),
            )
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def get_all_consents_for_student(self, student_id: uuid.UUID) -> Sequence[Consent]:
        """Fetch complete consent history (active and revoked) for a student."""
        statement = (
            select(Consent)
            .options(selectinload(Consent.guardian))
            .where(Consent.student_id == student_id)
            .order_by(Consent.created_at.desc())
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def has_consent(self, student_id: uuid.UUID, scope: str | None = None) -> bool:
        """Verify whether a student has an active granted consent."""
        conditions = [
            Consent.student_id == student_id,
            Consent.is_granted == True,  # noqa: E712
            Consent.revoked_at.is_(None),
        ]
        if scope:
            conditions.append(Consent.scope.in_([scope, "all"]))
        statement = select(Consent).where(*conditions)
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
        """Record newly granted consent or reactivate previous consent."""
        statement = select(Consent).where(
            Consent.student_id == student_id,
            Consent.scope == scope,
        )
        result = await self.session.execute(statement)
        existing = result.scalar_one_or_none()

        if existing is not None:
            existing.version = version
            existing.is_granted = True
            existing.revoked_at = None
            existing.timestamp = datetime.now(UTC)
            if guardian_id:
                existing.guardian_id = guardian_id
            if ip_address:
                existing.ip_address = ip_address
            await self.session.flush()
            return existing

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

    async def withdraw_consent(
        self,
        student_id: uuid.UUID,
        scope: str | None = None,
    ) -> int:
        """Withdraw consent for a specific scope or all scopes under DPDP rights."""
        statement = select(Consent).where(
            Consent.student_id == student_id,
            Consent.is_granted == True,  # noqa: E712
            Consent.revoked_at.is_(None),
        )
        if scope:
            statement = statement.where(Consent.scope == scope)

        result = await self.session.execute(statement)
        consents = result.scalars().all()
        now = datetime.now(UTC)
        for consent in consents:
            consent.is_granted = False
            consent.revoked_at = now

        await self.session.flush()
        return len(consents)

    async def revoke_consent(self, consent_id: uuid.UUID) -> Consent | None:
        """Revoke a previously granted consent by ID."""
        consent = await self.get_by_id(consent_id)
        if consent is not None:
            consent.is_granted = False
            consent.revoked_at = datetime.now(UTC)
            await self.session.flush()
        return consent

    async def get_or_create_guardian(
        self,
        student_id: uuid.UUID,
        name: str,
        phone: str,
        relation_type: str,
    ) -> Guardian:
        """Fetch or create a guardian record for a minor student."""
        statement = select(Guardian).where(Guardian.student_id == student_id)
        result = await self.session.execute(statement)
        guardian = result.scalar_one_or_none()

        if guardian is None:
            guardian = Guardian(
                student_id=student_id,
                name=name.strip(),
                phone=phone.strip(),
                relation_type=relation_type.strip(),
                is_verified=True,
            )
            self.session.add(guardian)
        else:
            guardian.name = name.strip()
            guardian.phone = phone.strip()
            guardian.relation_type = relation_type.strip()

        await self.session.flush()
        return guardian

    async def get_guardian(self, student_id: uuid.UUID) -> Guardian | None:
        """Retrieve guardian record for a student."""
        statement = select(Guardian).where(Guardian.student_id == student_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()
