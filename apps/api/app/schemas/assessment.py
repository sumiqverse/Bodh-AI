"""Assessment questions, attempt submission, and mastery schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class QuestionOptionResponse(BaseModel):
    """Question multiple-choice option."""

    id: str = Field(description="Option identifier (A, B, C, D)")
    text: str = Field(description="Localized option label text")


class QuestionResponse(BaseModel):
    """Calibrated question item presented to student (answer-leak safe)."""

    id: uuid.UUID
    code: str
    skill_id: uuid.UUID
    difficulty: int
    question_type: str
    prompt: str
    options: list[QuestionOptionResponse] | None = None
    hints: list[str] = Field(default_factory=list)


class QuestionDetailResponse(BaseModel):
    """Full question details for educators/teachers/admins including solutions and audit fields."""

    id: uuid.UUID
    code: str
    skill_id: uuid.UUID
    difficulty: int
    question_type: str
    status: str
    needs_teacher_review: bool
    version: int
    reviewer_id: uuid.UUID | None = None
    prompt: str
    options: list[dict[str, Any]] | None = None
    verified_answer: str
    worked_solution: str
    explanation: str | None = None
    hints: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class QuestionStatusUpdateRequest(BaseModel):
    """Request payload to transition question editorial review state."""

    status: str = Field(pattern="^(draft|reviewed|published)$")
    needs_teacher_review: bool | None = None


class QuestionUpdateRequest(BaseModel):
    """Teacher/Admin edit payload for question items."""

    difficulty: int | None = Field(default=None, ge=1, le=5)
    question_type: str | None = None
    needs_teacher_review: bool | None = None
    prompt: str | None = None
    options: list[dict[str, Any]] | None = None
    verified_answer: str | None = None
    worked_solution: str | None = None
    explanation: str | None = None
    hints: list[str] | None = None
    language: str = "en"


class AttemptSubmitRequest(BaseModel):
    """Practice question response submission payload."""

    question_id: uuid.UUID
    skill_id: uuid.UUID
    selected_answer: str = Field(description="Answer identifier (e.g. 'B') or numeric string")
    idempotency_key: str = Field(
        min_length=8,
        max_length=64,
        description="Client-generated unique UUID preventing duplicate submissions",
    )
    time_spent_ms: int = Field(ge=0, description="Time spent solving the question in milliseconds")
    client_timestamp: datetime = Field(description="Client-side UTC timestamp when completed")


class AttemptResponse(BaseModel):
    """Evaluation result for a submitted attempt."""

    attempt_id: uuid.UUID
    is_correct: bool
    p_mastery_after: float = Field(description="Updated Bayesian mastery probability [0.0 - 1.0]")
    explanation: str = Field(description="Step-by-step conceptual solution")
    rationale: str = Field(
        default="", description="Pedagogical rationale explaining mastery update"
    )
    is_duplicate: bool = Field(
        default=False, description="Flag indicating if idempotency deduplicated this request"
    )


class MasteryResponse(BaseModel):
    """Student competency mastery summary."""

    skill_id: uuid.UUID
    p_mastery: float
    confidence: float
    attempts_count: int
    correct_count: int
    last_attempted_at: datetime | None = None
    state: str = Field(default="not_learned", description="not_learned, partial, mastered")
    rationale: str = Field(default="", description="Pedagogical explanation of current state")
    skill_name: str | None = Field(default=None, description="Human-readable skill name")
    topic_name: str | None = Field(default=None, description="Topic or unit name")
    skill_code: str | None = Field(default=None, description="Official NCERT skill code")


class DiagnosticStartRequest(BaseModel):
    """Payload to start a CAT diagnostic assessment session."""

    curriculum_code: str = Field(default="NCERT-MATH-C8", description="Target curriculum code")
    initial_skills: list[str] | None = Field(
        default=None, description="Optional subset of skill codes to assess"
    )
    language: str = Field(default="en", description="Preferred response language ('en', 'hi')")


class DiagnosticProgressRequest(BaseModel):
    """Payload to submit answer and advance CAT diagnostic session."""

    session_id: str = Field(description="Unique session identifier")
    question_id: str = Field(description="Question identifier")
    selected_answer: str = Field(description="Selected answer option ID")
    time_spent_ms: int = Field(ge=0, description="Time spent solving in milliseconds")
    hint_level: int = Field(default=0, ge=0, le=3, description="Hint scaffold level requested")
    language: str = Field(default="en", description="Preferred response language ('en', 'hi')")


class DiagnosticItemResponse(BaseModel):
    """Question item returned within diagnostic session."""

    question_id: str
    code: str
    skill_id: str
    skill_code: str
    difficulty: int
    prompt: str
    options: list[dict[str, Any]] | None = None
    question_type: str = "mcq"
    topic_name: str | None = None


class DiagnosticResponse(BaseModel):
    """Diagnostic response with next question or termination summary."""

    session_id: str
    is_completed: bool
    questions_answered: int
    next_item: DiagnosticItemResponse | None = None
    rationale: str = Field(
        default="", description="Why this item was selected or why diagnostic stopped"
    )
    stop_reason: str | None = None
    summary: dict[str, Any] | None = None
    last_is_correct: bool | None = None
    correct_answer_id: str | None = None
    explanation: str | None = None
    is_weakness_review: bool = False


class NextItemResponse(BaseModel):
    """Recommended learning item with pedagogical justification."""

    question_id: uuid.UUID
    code: str
    skill_id: uuid.UUID
    skill_code: str
    difficulty: int
    question_type: str
    prompt: str
    options: list[dict[str, Any]] | None = None
    hints: list[str] = Field(default_factory=list)
    predicted_success: float = Field(
        default=0.75, description="Predicted success probability [0.0 - 1.0]"
    )
    score: float = Field(default=0.0, description="Composite recommendation ranking score")
    score_breakdown: dict[str, float] = Field(default_factory=dict)
    hint_ladder: int = Field(
        default=0, description="0=none, 1=hint, 2=worked example, 3=prerequisite review"
    )
    is_test_gate: bool = Field(
        default=False, description="Flag indicating 3-item hint-free test gate verification"
    )
    is_skip_ahead: bool = Field(default=False, description="Flag indicating skip-ahead triggered")
    rationale: str = Field(
        description="Transparent pedagogical rationale explaining why this item was selected"
    )
