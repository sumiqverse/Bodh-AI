"""Skills and prerequisite knowledge graph API v1 routes."""

import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.db.session import get_db
from app.repositories.skill_repo import SkillRepository
from app.schemas.curriculum import PrerequisiteResponse, SkillResponse

router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get("/{skill_id}", response_model=SkillResponse, summary="Get Skill by ID")
async def get_skill(
    skill_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> SkillResponse:
    """Retrieve atomic competency node by UUID."""
    repo = SkillRepository(session)
    skill = await repo.get_by_id(skill_id)
    if skill is None:
        raise NotFoundError("Skill", skill_id)

    return SkillResponse(
        id=skill.id,
        topic_id=skill.topic_id,
        code=skill.code,
        name=skill.name,
        description=skill.description,
        difficulty=skill.difficulty,
        blooms_level=skill.blooms_level,
    )


@router.get(
    "/{skill_id}/prerequisites",
    response_model=list[PrerequisiteResponse],
    summary="Get Skill Prerequisites",
)
async def get_skill_prerequisites(
    skill_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Sequence[PrerequisiteResponse]:
    """Retrieve incoming prerequisite dependency graph edges for a skill."""
    repo = SkillRepository(session)
    prereqs = await repo.get_prerequisites(skill_id)
    return [
        PrerequisiteResponse(
            parent_skill_id=p.parent_skill_id,
            child_skill_id=p.child_skill_id,
            relation_type=p.relation_type,
        )
        for p in prereqs
    ]


@router.get(
    "/by-topic/{topic_id}",
    response_model=list[SkillResponse],
    summary="List Skills by Topic",
)
async def list_skills_by_topic(
    topic_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Sequence[SkillResponse]:
    """Retrieve all skills under a curriculum topic."""
    repo = SkillRepository(session)
    skills = await repo.list_by_topic(topic_id)
    return [
        SkillResponse(
            id=s.id,
            topic_id=s.topic_id,
            code=s.code,
            name=s.name,
            description=s.description,
            difficulty=s.difficulty,
            blooms_level=s.blooms_level,
        )
        for s in skills
    ]
