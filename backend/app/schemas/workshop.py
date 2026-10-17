from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class WorkshopCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Title of the workshop")
    description: Optional[str] = Field(None, description="Detailed description")
    schedule: datetime = Field(..., description="Scheduled date and time (UTC)")
    capacity: int = Field(..., gt=0, le=10000, description="Maximum number of attendees")

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Workshop title cannot be empty or whitespace only")
        return v_stripped

    @field_validator("schedule")
    @classmethod
    def validate_schedule(cls, v: datetime) -> datetime:
        # If naive datetime provided, treat as UTC
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v <= datetime.now(timezone.utc):
            raise ValueError("Workshop schedule must be a future date and time")
        return v


class WorkshopResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: Optional[str] = None
    schedule: datetime
    capacity: int
    status: str
    cancelled_at: Optional[datetime] = None
    registered_count: int = 0
    available_capacity: int = 0
    created_at: datetime
    updated_at: datetime


class WorkshopCancelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    status: str
    cancelled_at: Optional[datetime] = None
    notifications_queued: int = 0
    message: str = "Workshop successfully cancelled and cancellation notifications queued"
