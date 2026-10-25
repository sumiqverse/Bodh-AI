"""User repository handling account lookups, role resolution, and persistence."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth import Role, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository operations for User accounts."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(User, session)

    async def get_by_id_with_role(self, user_id: uuid.UUID) -> User | None:
        """Find user by UUID with role eagerly loaded."""
        statement = (
            select(User)
            .options(selectinload(User.role))
            .where(
                User.id == user_id,
                User.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Find an active user by case-insensitive email address with role eagerly loaded."""
        statement = (
            select(User)
            .options(selectinload(User.role))
            .where(
                User.email == email.lower().strip(),
                User.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        """Find an active user by username with role eagerly loaded."""
        statement = (
            select(User)
            .options(selectinload(User.role))
            .where(
                User.username == username.strip(),
                User.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> User | None:
        """Find an active user by phone number."""
        statement = (
            select(User)
            .options(selectinload(User.role))
            .where(
                User.phone == phone.strip(),
                User.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_or_create_default_role(self, role_name: str = "student") -> Role:
        """Retrieve existing role by name or create default."""
        statement = select(Role).where(Role.name == role_name)
        result = await self.session.execute(statement)
        role = result.scalar_one_or_none()
        if role is None:
            role = Role(
                name=role_name,
                description=f"Standard {role_name} role",
                permissions=["practice:read", "practice:submit"],
            )
            self.session.add(role)
            await self.session.flush()
        return role

    async def record_login_failure(self, user: User, max_attempts: int = 5) -> None:
        """Increment failed attempts and apply 15-minute lockout if threshold met."""
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= max_attempts:
            user.locked_until = datetime.now(UTC) + timedelta(minutes=15)
        await self.session.flush()

    async def record_login_success(self, user: User) -> None:
        """Reset failed login counter and clear lockout status upon successful auth."""
        user.failed_login_attempts = 0
        user.locked_until = None
        await self.session.flush()

    async def anonymize_student(self, user: User) -> None:
        """Anonymize and soft-delete student account under DPDP data erasure rights."""
        anon_id = user.id.hex[:8]
        user.full_name = f"Anonymized Student {anon_id}"
        user.username = f"anon_{anon_id}"
        user.email = None
        user.phone = None
        user.pin_hash = None
        user.hashed_password = None
        user.is_active = False
        user.is_deleted = True
        user.deleted_at = datetime.now(UTC)
        await self.session.flush()
