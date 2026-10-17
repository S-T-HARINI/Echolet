from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, generate_uuid, utc_now

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.registration import Registration
    from backend.app.models.outbox import NotificationOutbox


class WorkshopStatus:
    SCHEDULED = "SCHEDULED"
    CANCELLED = "CANCELLED"

    ALL = {SCHEDULED, CANCELLED}


class Workshop(Base):
    __tablename__ = "workshops"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    schedule: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    current_registrations: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=WorkshopStatus.SCHEDULED,
        index=True
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    organizer_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Relationships
    organizer: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="workshops"
    )
    registrations: Mapped[List["Registration"]] = relationship(
        "Registration",
        back_populates="workshop",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    notifications: Mapped[List["NotificationOutbox"]] = relationship(
        "NotificationOutbox",
        back_populates="workshop",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def is_cancelled(self) -> bool:
        return self.status == WorkshopStatus.CANCELLED

    def is_scheduled(self) -> bool:
        return self.status == WorkshopStatus.SCHEDULED
