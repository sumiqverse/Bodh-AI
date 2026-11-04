"""Curriculum and skill graph schemas."""

import uuid
from typing import Any

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


class SearchTopicItem(BaseModel):
    """Topic search match."""

    id: uuid.UUID
    code: str
    name: str
    description: str | None = None
    sequence_order: int
    curriculum_id: uuid.UUID
    curriculum_code: str
    grade: int
    subject: str


class SearchSkillItem(BaseModel):
    """Skill competency search match."""

    id: uuid.UUID
    code: str
    name: str
    description: str | None = None
    difficulty: float
    blooms_level: str
    topic_id: uuid.UUID
    topic_code: str
    topic_name: str
    grade: int
    subject: str


class CurriculumSearchResponse(BaseModel):
    """Full search response across NCERT topics and skills."""

    query: str
    grade: int | None = None
    subject: str | None = None
    total_topics: int
    total_skills: int
    topics: list[SearchTopicItem] = Field(default_factory=list)
    skills: list[SearchSkillItem] = Field(default_factory=list)


class QuestionOptionItem(BaseModel):
    """Single multiple-choice option."""

    id: str = Field(min_length=1, max_length=20)
    text: str = Field(min_length=1, max_length=2000)
    is_correct: bool = False
    distractor_feedback: str | None = None


class CustomQuestionCreateRequest(BaseModel):
    """Teacher custom question creation payload."""

    skill_code: str = Field(description="Target skill competency code e.g. SKILL-M8-01-01")
    prompt_en: str = Field(min_length=5, description="English prompt with LaTeX math support")
    prompt_hi: str | None = Field(default=None, description="Optional Hindi localized prompt")
    options: list[QuestionOptionItem] = Field(min_length=2, description="List of options")
    difficulty: int = Field(default=3, ge=1, le=5, description="Difficulty rating (1-5)")
    explanation: str = Field(min_length=5, description="Detailed pedagogical explanation")
    hints: list[str] = Field(
        min_length=1, max_length=5, description="Progressive hints (Level 1, 2, 3)"
    )


class CustomQuestionResponse(BaseModel):
    """Created question response."""

    id: uuid.UUID
    code: str
    skill_code: str
    prompt: str
    options: list[dict[str, Any]]
    explanation: str
    hints: list[str]
    difficulty: int
    status: str


class ClassroomQuestionItem(BaseModel):
    """Assessment item preview inside classroom content."""

    id: uuid.UUID
    code: str
    prompt: str
    options: list[dict[str, Any]]
    explanation: str
    hints: list[str]
    difficulty: int
    is_custom: bool = False


class ClassroomDefaultLesson(BaseModel):
    """Ready-to-use NCERT-aligned lesson shown when a class has no custom lesson."""

    title: str
    body: str


class ClassroomSkillItem(BaseModel):
    """Competency skill with associated questions."""

    id: uuid.UUID
    code: str
    name: str
    description: str | None = None
    difficulty: float
    blooms_level: str
    questions: list[ClassroomQuestionItem] = Field(default_factory=list)
    default_lesson: ClassroomDefaultLesson | None = None


class ClassroomTopicItem(BaseModel):
    """Topic chapter with competencies."""

    id: uuid.UUID
    code: str
    name: str
    description: str | None = None
    sequence_order: int
    skills: list[ClassroomSkillItem] = Field(default_factory=list)


class ClassroomContentResponse(BaseModel):
    """Full curriculum topics, skills, and questions for a teacher's classroom."""

    class_id: uuid.UUID
    class_name: str
    grade: int
    subject: str
    curriculum_code: str
    topics: list[ClassroomTopicItem] = Field(default_factory=list)
    custom_questions_count: int = 0
