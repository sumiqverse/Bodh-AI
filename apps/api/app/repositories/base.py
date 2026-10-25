"""Generic base repository providing type-safe CRUD operations."""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository[ModelType: Base]:
    """Abstract base repository encapsulating common database interactions."""

    def __init__(self, model: type[ModelType], session: AsyncSession) -> None:
        self.model = model
        self.session = session

    async def get_by_id(self, entity_id: uuid.UUID) -> ModelType | None:
        """Fetch a single record by primary key UUID."""
        id_col = getattr(self.model, "id")  # noqa: B009
        statement = select(self.model).where(id_col == entity_id)
        if hasattr(self.model, "is_deleted"):
            statement = statement.where(getattr(self.model, "is_deleted") == False)  # noqa: B009, E712
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Sequence[Any] | None = None,
    ) -> Sequence[ModelType]:
        """Fetch a paginated list of records."""
        statement = select(self.model)
        if hasattr(self.model, "is_deleted"):
            statement = statement.where(getattr(self.model, "is_deleted") == False)  # noqa: B009, E712
        if filters:
            statement = statement.where(*filters)
        statement = statement.offset(skip).limit(limit)
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def create(self, entity: ModelType) -> ModelType:
        """Persist a new entity into the database."""
        self.session.add(entity)
        await self.session.flush()
        return entity

    async def update(self, entity: ModelType) -> ModelType:
        """Update an existing entity."""
        await self.session.flush()
        return entity

    async def delete(self, entity: ModelType, soft: bool = True) -> None:
        """Delete an entity (soft delete if supported and requested, otherwise hard delete)."""
        if soft and hasattr(entity, "is_deleted"):
            setattr(entity, "is_deleted", True)  # noqa: B010
            if hasattr(entity, "deleted_at"):
                setattr(entity, "deleted_at", datetime.now(UTC))  # noqa: B010
            await self.session.flush()
        else:
            await self.session.delete(entity)
            await self.session.flush()

    async def count(self, filters: Sequence[Any] | None = None) -> int:
        """Count total matching rows."""
        statement = select(func.count()).select_from(self.model)
        if hasattr(self.model, "is_deleted"):
            statement = statement.where(getattr(self.model, "is_deleted") == False)  # noqa: B009, E712
        if filters:
            statement = statement.where(*filters)
        result = await self.session.execute(statement)
        scalar = result.scalar()
        return int(scalar) if scalar is not None else 0
