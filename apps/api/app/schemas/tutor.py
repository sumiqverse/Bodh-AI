"""Pydantic schemas for AI Tutor requests, responses, and evaluation payloads."""

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TutorQueryRequest(BaseModel):
    """Student query payload for Socratic pedagogical assistance."""

    skill_id: uuid.UUID = Field(
        ...,
        description="Target atomic competency UUID",
    )
    student_query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Student question or misconception description",
    )
    language: Literal["en", "hi"] = Field(
        default="en",
        description="Target instructional language: en or hi",
    )
    depth: Literal["simple", "standard", "deep"] = Field(
        default="standard",
        description="Explanation depth level",
    )
    hint_level: int = Field(
        default=1,
        ge=1,
        le=3,
        description="Progressive scaffold hint ladder level (1-3)",
    )
    is_test_mode: bool = Field(
        default=False,
        description="Safety flag: in Test mode, the tutor cannot reveal answers",
    )
    question_id: uuid.UUID | None = Field(
        default=None,
        description="Optional current question UUID being solved",
    )

    model_config = ConfigDict(extra="forbid")


class TutorResponseSchema(BaseModel):
    """Structured, verified pedagogical tutor output."""

    can_help: bool = Field(
        ...,
        description="True if grounded in verified curriculum context; False if refused",
    )
    explanation: str = Field(
        ...,
        description="Pedagogical explanation or polite refusal text",
    )
    scaffolded_hint: str | None = Field(
        default=None,
        description="Socratic progressive guidance step",
    )
    follow_up_question: str | None = Field(
        default=None,
        description="Checking-for-understanding question",
    )
    math_latex: str | None = Field(
        default=None,
        description="KaTeX mathematical expression if relevant",
    )
    static_fallback_used: bool = Field(
        default=False,
        description="True if static teacher-approved solution was returned",
    )
    static_worked_solution: str | None = Field(
        default=None,
        description="Verified step-by-step worked solution",
    )
    grounded_sources: list[str] = Field(
        default_factory=list,
        description="Source curriculum competence codes grounding this response",
    )
    refusal_reason: str | None = Field(
        default=None,
        description=(
            "Reason if query was refused (test_mode, off_topic, prompt_injection, low_similarity)"
        ),
    )
    tokens_used: int = Field(
        default=0,
        description="LLM token consumption count",
    )
    estimated_cost_usd: float = Field(
        default=0.0,
        description="Estimated API cost in USD",
    )

    model_config = ConfigDict(from_attributes=True)


class TutorIngestRequest(BaseModel):
    """Trigger ingestion of teacher-approved published content into pgvector."""

    curriculum_id: uuid.UUID | None = Field(
        default=None,
        description="Optional filter for specific curriculum ID",
    )
    force_reindex: bool = Field(
        default=False,
        description="If True, clear existing chunks and re-embed all published items",
    )


class TutorIngestResponse(BaseModel):
    """Summary of vector chunk ingestion."""

    total_published_questions_indexed: int
    total_curriculum_notes_indexed: int
    total_chunks_created: int
    duration_seconds: float


class TutorMonthlyBudgetResponse(BaseModel):
    """Current monthly LLM cost and budget alert state."""

    billing_month: str
    total_tokens: int
    total_cost_usd: float
    budget_limit_usd: float
    percent_used: float
    alert_triggered: bool


class EvalCase(BaseModel):
    """Single evaluation case definition for groundedness and safety tests."""

    case_id: str
    category: Literal["grounded", "adversarial", "test_mode", "off_topic", "ungrounded"]
    skill_code: str
    student_query: str
    is_test_mode: bool = False
    language: Literal["en", "hi"] = "en"
    canonical_answer: str | None = None
    expected_refusal: bool = False
    expected_grounded: bool = True
