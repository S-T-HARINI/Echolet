import enum
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, generate_uuid, utc_now


class UserRole(str, enum.Enum):
    ORGANIZER = "ORGANIZER"
    MEMBER = "MEMBER"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=UserRole.MEMBER.value,
        index=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    # Relationships
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    workshops: Mapped[List["Workshop"]] = relationship(
        "Workshop",
        back_populates="organizer",
        lazy="selectin"
    )
    registrations: Mapped[List["Registration"]] = relationship(
        "Registration",
        back_populates="user",
        lazy="selectin"
    )

    def is_organizer(self) -> bool:
        return self.role == UserRole.ORGANIZER.value

    def is_member(self) -> bool:
        return self.role == UserRole.MEMBER.value


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )

    # Relationship
    user: Mapped["User"] = relationship(
        "User",
        back_populates="sessions"
    )

    __table_args__ = (
        Index("ix_user_sessions_lookup", "token_hash", "expires_at"),
    )
