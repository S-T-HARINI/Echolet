from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field


class NotificationRequest(BaseModel):
    idempotency_key: str = Field(..., description="Unique deterministic key to prevent duplicate deliveries")
    recipient_email: EmailStr = Field(..., description="Recipient email address")
    recipient_name: str = Field(..., description="Recipient full name")
    event_type: str = Field(..., description="Event type string")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Event payload data")


class NotificationDeliveryResponse(BaseModel):
    status: str = "delivered"
    delivery_id: str
    idempotency_key: str
    idempotent_replay: bool
    delivered_at: datetime
    message: str


class SimulatorConfig(BaseModel):
    mode: str = Field(
        default="normal",
        description="Failure simulation mode: normal, fail_500, timeout, delay, flaky",
    )
    delay_seconds: float = Field(default=0.0, ge=0.0, le=60.0, description="Latency delay in seconds")
    failure_rate: float = Field(default=0.0, ge=0.0, le=1.0, description="Probability of failure (0.0 to 1.0)")
    fail_recipients: List[str] = Field(default_factory=list, description="List of emails that should always fail")
    timeout_recipients: List[str] = Field(default_factory=list, description="List of emails that should always timeout")


class SimulatorStatus(BaseModel):
    mode: str
    delay_seconds: float
    failure_rate: float
    fail_recipients: List[str]
    timeout_recipients: List[str]
    total_received: int
    total_delivered: int
    total_failed: int
    total_deduplicated: int
