"""Client synchronization event schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SyncItemRequest(BaseModel):
    """Individual queued offline action."""

    client_event_id: str = Field(description="Unique client UUID for deduplication")
    event_type: str = Field(description="Event type name (e.g. attempt_submission)")
    payload: dict[str, Any] = Field(description="Event data payload")
    timestamp: datetime = Field(description="Client creation timestamp")


class SyncBatchRequest(BaseModel):
    """Batch payload sent during network reconnection."""

    events: list[SyncItemRequest] = Field(description="List of queued offline events")


class SyncItemResult(BaseModel):
    """Individual synchronization outcome."""

    client_event_id: str
    status: str
    error: str | None = None


class SyncBatchResponse(BaseModel):
    """Summary of batch synchronization execution."""

    processed: int
    failed: int
    results: list[SyncItemResult]
