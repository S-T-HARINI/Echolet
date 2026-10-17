from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, generate_uuid, utc_now


class RegistrationStatus:
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"

    ALL = {CONFIRMED, CANCELLED}


class Registration(Base):
    __tablename__ = "registrations"

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
    member_id: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        index=True
    )
    member_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    member_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=RegistrationStatus.CONFIRMED,
        index=True
    )
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False
    )

    # Relationship
    workshop: Mapped["Workshop"] = relationship(
        "Workshop",
        back_populates="registrations"
    )

    __table_args__ = (
        UniqueConstraint("workshop_id", "member_id", name="uq_registrations_workshop_member"),
        Index("ix_registrations_workshop_status", "workshop_id", "status"),
    )
