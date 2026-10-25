"""Package containing all Pydantic v2 schemas for BodhAI API."""

from app.schemas.assessment import (
    AttemptResponse,
    AttemptSubmitRequest,
    MasteryResponse,
    QuestionOptionResponse,
    QuestionResponse,
)
from app.schemas.consent import ConsentCreateRequest, ConsentResponse
from app.schemas.curriculum import (
    CurriculumResponse,
    PrerequisiteResponse,
    SkillResponse,
    TopicResponse,
)
from app.schemas.health import HealthResponse, ReadyResponse
from app.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncItemRequest,
    SyncItemResult,
)

__all__ = [
    "AttemptResponse",
    "AttemptSubmitRequest",
    "ConsentCreateRequest",
    "ConsentResponse",
    "CurriculumResponse",
    "HealthResponse",
    "MasteryResponse",
    "PrerequisiteResponse",
    "QuestionOptionResponse",
    "QuestionResponse",
    "ReadyResponse",
    "SkillResponse",
    "SyncBatchRequest",
    "SyncBatchResponse",
    "SyncItemRequest",
    "SyncItemResult",
    "TopicResponse",
]
