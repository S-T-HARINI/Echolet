from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, generate_uuid, utc_now


class NotificationStatus:
    PENDING = "PENDING"
    CLAIMED = "CLAIMED"
    DELIVERED = "DELIVERED"
    RETRYING = "RETRYING"
    FAILED = "FAILED"

    ALL = {PENDING, CLAIMED, DELIVERED, RETRYING, FAILED}


class NotificationEventType:
    WORKSHOP_REGISTRATION_CONFIRMATION = "WORKSHOP_REGISTRATION_CONFIRMATION"
    WORKSHOP_CANCELLATION = "WORKSHOP_CANCELLATION"

    ALL = {WORKSHOP_REGISTRATION_CONFIRMATION, WORKSHOP_CANCELLATION}


class NotificationOutbox(Base):
    __tablename__ = "notification_outbox"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid
    )
    workshop_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("workshops.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    recipient_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    recipient_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    event_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True
    )
    payload: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )
    idempotency_key: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=NotificationStatus.PENDING,
        index=True
    )
    attempt_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    last_error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    next_retry_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        index=True
    )
    claimed_by: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True
    )
    claim_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationship
    workshop: Mapped["Workshop"] = relationship(
        "Workshop",
        back_populates="notifications"
    )

    __table_args__ = (
        Index("ix_outbox_polling", "status", "next_retry_at"),
        Index("ix_outbox_lease_expiry", "status", "claim_expires_at"),
    )
