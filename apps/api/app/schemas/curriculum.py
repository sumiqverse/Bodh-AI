"""Curriculum and skill graph schemas."""

import uuid

from pydantic import BaseModel, Field


class TopicResponse(BaseModel):
    """Curriculum topic summary."""

    id: uuid.UUID
    code: str
    name: str
    description: str | None = None
    sequence_order: int


class CurriculumResponse(BaseModel):
    """Board curriculum response with associated topics."""

    id: uuid.UUID
    code: str
    board: str
    grade: int
    subject: str
    version: str
    topics: list[TopicResponse] = Field(default_factory=list)


class PrerequisiteResponse(BaseModel):
    """Prerequisite relationship edge."""

    parent_skill_id: uuid.UUID
    child_skill_id: uuid.UUID
    relation_type: str


class SkillResponse(BaseModel):
    """Atomic competency node details."""

    id: uuid.UUID
    topic_id: uuid.UUID
    code: str
    name: str
    description: str
    difficulty: float
    blooms_level: str
