import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from mock_service.app.config import mock_settings


class MockBase(DeclarativeBase):
    pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class MockDelivery(MockBase):
    __tablename__ = "mock_deliveries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    recipient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    attempt_seen_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    delivered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


mock_engine = create_async_engine(mock_settings.DATABASE_URL, echo=False)
MockSessionLocal = async_sessionmaker(bind=mock_engine, class_=AsyncSession, expire_on_commit=False)


async def init_mock_db() -> None:
    async with mock_engine.begin() as conn:
        await conn.run_sync(MockBase.metadata.create_all)
