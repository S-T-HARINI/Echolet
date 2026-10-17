from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegistrationCreate(BaseModel):
    member_id: str = Field(..., min_length=1, max_length=128, description="Unique identifier for the member")
    member_name: str = Field(..., min_length=1, max_length=255, description="Full name of member")
    member_email: EmailStr = Field(..., description="Valid email address of member")

    @field_validator("member_id", "member_name")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Field cannot be empty or whitespace only")
        return v_stripped


class RegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workshop_id: str
    member_id: str
    member_name: str
    member_email: str
    status: str
    registered_at: datetime
    notification_id: str
    notification_status: str
    message: str = "Registration accepted and persisted. Confirmation notification queued in outbox."
