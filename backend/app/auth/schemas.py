from datetime import datetime
from typing import Optional
from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)
from backend.app.models.user import UserRole


class UserSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = Field(default=UserRole.MEMBER, description="User role: ORGANIZER or MEMBER")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, v):
        if isinstance(v, str):
            v_clean = v.strip().upper()
            if v_clean in ("ORGANIZER", "MEMBER"):
                return UserRole(v_clean)
        return v

    @model_validator(mode="before")
    @classmethod
    def map_aliases(cls, data):
        if isinstance(data, dict):
            # Support both 'name' and 'full_name' from frontend clients
            if "name" not in data and "full_name" in data:
                data["name"] = data["full_name"]
        return data


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    user: UserResponse
    token: str
    message: str
