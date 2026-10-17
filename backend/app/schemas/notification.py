from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workshop_id: str
    recipient_email: str
    recipient_name: str
    event_type: str
    payload: Dict[str, Any]
    idempotency_key: str
    status: str
    attempt_count: int
    last_error: Optional[str] = None
    next_retry_at: datetime
    claimed_by: Optional[str] = None
    claim_expires_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class NotificationSummaryResponse(BaseModel):
    total: int
    pending: int
    claimed: int
    retrying: int
    delivered: int
    failed: int


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    limit: int
    offset: int
