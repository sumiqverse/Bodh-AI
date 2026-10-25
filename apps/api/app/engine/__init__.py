"""Pure, dependency-light adaptive learning engine package for BodhAI.

Exposes:
- BKT Bayesian Knowledge Tracing updating, prediction, and EIG calculation.
- MasteryStateMachine with 3-observation rule, test gate, and rapid-guess down-weighting.
- Root-cause recursive search in NetworkX and SQL recursive CTE.
- DifficultyController with 70-80% predicted success targeting and hint ladder.
- RecommendationRanker with multi-objective weighted scoring.
- CATDiagnosticEngine with EIG-driven adaptive questioning and backward prerequisite walking.
- Expectation-Maximization (Baum-Welch) BKT fitting.
"""

from app.engine.bkt import (
    binary_entropy,
    clamp_probability,
    compute_posterior,
    expected_information_gain,
    predict_success,
    update_bkt,
)
from app.engine.diagnostic import (
    CATDiagnosticEngine,
    DiagnosticDecision,
    DiagnosticQuestionItem,
    DiagnosticSummary,
)
from app.engine.difficulty import DifficultyController
from app.engine.em_fitting import fit_bkt_em
from app.engine.mastery import MasteryStateMachine
from app.engine.models import (
    BKTParams,
    DiagnosticConfig,
    DiagnosticSessionState,
    DifficultyRules,
    HintLevel,
    MasteryState,
    MasteryThresholds,
    NextItemDecision,
    Observation,
    RankerWeights,
    SkillState,
)
from app.engine.ranker import CandidateItem, RecommendationRanker
from app.engine.root_cause import (
    RootCauseResult,
    find_deepest_unmastered_networkx,
    find_deepest_unmastered_recursive_algorithm,
    find_deepest_unmastered_sql_cte,
)

__all__ = [
    "BKTParams",
    "CATDiagnosticEngine",
    "CandidateItem",
    "DiagnosticConfig",
    "DiagnosticDecision",
    "DiagnosticQuestionItem",
    "DiagnosticSessionState",
    "DiagnosticSummary",
    "DifficultyController",
    "DifficultyRules",
    "HintLevel",
    "MasteryState",
    "MasteryStateMachine",
    "MasteryThresholds",
    "NextItemDecision",
    "Observation",
    "RankerWeights",
    "RecommendationRanker",
    "RootCauseResult",
    "SkillState",
    "binary_entropy",
    "clamp_probability",
    "compute_posterior",
    "expected_information_gain",
    "find_deepest_unmastered_networkx",
    "find_deepest_unmastered_recursive_algorithm",
    "find_deepest_unmastered_sql_cte",
    "fit_bkt_em",
    "predict_success",
    "update_bkt",
]
