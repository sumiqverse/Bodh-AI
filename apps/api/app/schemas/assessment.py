"""Assessment questions, attempt submission, and mastery schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class QuestionOptionResponse(BaseModel):
    """Question multiple-choice option."""

    id: str = Field(description="Option identifier (A, B, C, D)")
    text: str = Field(description="Localized option label text")


class QuestionResponse(BaseModel):
    """Calibrated question item presented to student."""

    id: uuid.UUID
    skill_id: uuid.UUID
    difficulty: float
    question_type: str
    prompt: str
    options: list[QuestionOptionResponse]
    hints: list[str] = Field(default_factory=list)


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
