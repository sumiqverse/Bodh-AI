"""Domain models, configurations, and state definitions for the adaptive learning engine."""

from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime


class MasteryState(enum.StrEnum):
    """Pedagogical mastery states."""

    NOT_LEARNED = "not_learned"
    PARTIAL = "partial"
    MASTERED = "mastered"


class HintLevel(int, enum.Enum):
    """Scaffolded hint ladder levels."""

    NONE = 0
    HINT = 1
    WORKED_EXAMPLE = 2
    PREREQUISITE_REVIEW = 3


@dataclass(frozen=True)
class BKTParams:
    """Bayesian Knowledge Tracing skill-level parameters.

    Attributes:
        p_init (L0): Prior probability of initial mastery before first observation.
        p_transit (T): Probability of learning/transitioning from unlearned to learned state.
        p_guess (G): Probability of guessing correctly despite not knowing the skill.
        p_slip (S): Probability of slipping (incorrect response despite knowing the skill).
    """

    p_init: float = 0.30
    p_transit: float = 0.10
    p_guess: float = 0.20
    p_slip: float = 0.10

    def __post_init__(self) -> None:
        """Validate parameter ranges and identifiability constraints."""
        for name, val in [
            ("p_init", self.p_init),
            ("p_transit", self.p_transit),
            ("p_guess", self.p_guess),
            ("p_slip", self.p_slip),
        ]:
            if not (0.0 <= val <= 1.0):
                raise ValueError(f"{name} must be in [0.0, 1.0], got {val}")
        # Standard BKT identifiability: G + S < 1.0 ensures diagnostic validity
        if self.p_guess + self.p_slip >= 1.0:
            raise ValueError(
                f"Guess ({self.p_guess}) + Slip ({self.p_slip}) must be < 1.0 "
                "to preserve monotonicity"
            )


@dataclass(frozen=True)
class MasteryThresholds:
    """Configurable cutoffs and hysteresis bounds for mastery classification."""

    not_learned_max: float = 0.40
    mastered_min: float = 0.95
    min_observations: int = 3
    rapid_guess_time_s: float = 3.0
    rapid_guess_weight: float = 0.35

    def classify_probability(self, p_mastery: float) -> MasteryState:
        """Map raw mastery probability to threshold state."""
        if p_mastery >= self.mastered_min:
            return MasteryState.MASTERED
        if p_mastery >= self.not_learned_max:
            return MasteryState.PARTIAL
        return MasteryState.NOT_LEARNED


@dataclass(frozen=True)
class DifficultyRules:
    """Pedagogical flow-state difficulty constraints."""

    target_success_min: float = 0.70
    target_success_max: float = 0.80
    skip_ahead_threshold: float = 0.95
    skip_ahead_consecutive: int = 2
    test_gate_count: int = 3


@dataclass(frozen=True)
class RankerWeights:
    """Multi-objective weights for question and skill recommendation."""

    gap_priority: float = 0.40
    difficulty_fit: float = 0.30
    recency_penalty: float = 0.20
    curriculum_alignment: float = 0.10

    def __post_init__(self) -> None:
        """Ensure weights sum to 1.0."""
        total = (
            self.gap_priority
            + self.difficulty_fit
            + self.recency_penalty
            + self.curriculum_alignment
        )
        if abs(total - 1.0) > 1e-5:
            raise ValueError(f"Ranker weights must sum to 1.0, got {total}")


@dataclass(frozen=True)
class DiagnosticConfig:
    """CAT-style diagnostic assessment parameters."""

    min_questions: int = 15
    max_questions: int = 20
    uncertainty_threshold: float = 0.15


@dataclass
class Observation:
    """Record of a single student response used to update state."""

    skill_id: str
    is_correct: bool
    time_spent_s: float
    hint_level: HintLevel = HintLevel.NONE
    question_id: str | None = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))

    @property
    def is_rapid_guess(self) -> bool:
        """True if the student failed rapidly (less than 3.0 seconds)."""
        return not self.is_correct and self.time_spent_s < 3.0


@dataclass
class SkillState:
    """Student mastery snapshot for a specific atomic skill."""

    skill_id: str
    p_mastery: float = 0.30
    state: MasteryState = MasteryState.NOT_LEARNED
    observations_count: int = 0
    correct_count: int = 0
    consecutive_correct: int = 0
    hint_free_correct_count: int = 0
    last_attempt_at: datetime | None = None
    rapid_guesses_count: int = 0
    rationale: str = "Initial prior probability before diagnostic observation."


@dataclass
class NextItemDecision:
    """Selected next question item with full decision rationale."""

    question_id: str
    skill_id: str
    skill_code: str
    question_type: str
    difficulty: int
    predicted_success: float
    score: float
    score_breakdown: dict[str, float]
    rationale: str
    hint_ladder: HintLevel = HintLevel.NONE
    is_test_gate: bool = False
    is_skip_ahead: bool = False


@dataclass
class DiagnosticSessionState:
    """Progress and state tracking for a CAT diagnostic assessment."""

    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str = ""
    curriculum_code: str = "NCERT-MATH-08"
    questions_answered: int = 0
    skill_states: dict[str, SkillState] = field(default_factory=dict)
    attempted_question_ids: set[str] = field(default_factory=set)
    question_history: list[tuple[str, str, bool]] = field(default_factory=list)
    is_completed: bool = False
    stop_reason: str | None = None
    root_cause_gaps: list[str] = field(default_factory=list)
