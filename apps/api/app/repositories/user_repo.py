"""User repository handling account lookups and persistence."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import Role, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository operations for User accounts."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> User | None:
        """Find an active user by case-insensitive email address."""
        statement = select(User).where(
            User.email == email.lower().strip(),
            User.is_deleted == False,  # noqa: E712
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> User | None:
        """Find an active user by phone number."""
        statement = select(User).where(
            User.phone == phone.strip(),
            User.is_deleted == False,  # noqa: E712
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
