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


class GraphNode(BaseModel):
    """DAG visualization node (topic or atomic skill)."""

    id: str
    code: str
    name: str
    type: str  # "topic" or "skill"
    topic_code: str | None = None
    topic_name: str | None = None
    difficulty: float | None = None
    blooms_level: str | None = None


class GraphEdge(BaseModel):
    """Prerequisite dependency edge for graph visualization."""

    id: str
    source: str
    target: str
    relation_type: str = "hard"


class SkillGraphResponse(BaseModel):
    """Complete curriculum competency graph nodes and directed prerequisite edges."""

    curriculum_code: str
    curriculum_name: str
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class ContentImportResponse(BaseModel):
    """Diff report outcome of importing a content pack."""

    curriculum_code: str
    curriculum_created: int
    curriculum_updated: int
    topics_created: int
    topics_updated: int
    skills_created: int
    skills_updated: int
    prerequisites_created: int
    prerequisites_updated: int
    glossary_created: int
    glossary_updated: int
    questions_created: int
    questions_updated: int
    total_mutations: int
    details: list[str] = Field(default_factory=list)
