from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.exceptions import WorkshopNotFoundError, WorkshopCancelledError
from backend.app.models.base import utc_now
from backend.app.models.outbox import (
    NotificationEventType,
    NotificationOutbox,
    NotificationStatus,
)
from backend.app.models.registration import Registration, RegistrationStatus
from backend.app.models.workshop import Workshop, WorkshopStatus
from backend.app.schemas.workshop import WorkshopCreate


class WorkshopService:
    @staticmethod
    async def create_workshop(
        session: AsyncSession,
        data: WorkshopCreate,
        organizer_id: Optional[str] = None
    ) -> Workshop:
        workshop = Workshop(
            title=data.title,
            description=data.description,
            schedule=data.schedule,
            capacity=data.capacity,
            status=WorkshopStatus.SCHEDULED,
            organizer_id=organizer_id,
        )
        session.add(workshop)
        await session.commit()
        await session.refresh(workshop)
        return workshop

    @staticmethod
    async def get_workshop(session: AsyncSession, workshop_id: str) -> Workshop:
        stmt = select(Workshop).where(Workshop.id == workshop_id)
        result = await session.execute(stmt)
        workshop = result.scalar_one_or_none()
        if not workshop:
            raise WorkshopNotFoundError(workshop_id)
        return workshop

    @staticmethod
    async def get_confirmed_registration_count(session: AsyncSession, workshop_id: str) -> int:
        stmt = (
            select(func.count(Registration.id))
            .where(
                Registration.workshop_id == workshop_id,
                Registration.status == RegistrationStatus.CONFIRMED,
            )
        )
        result = await session.execute(stmt)
        return result.scalar() or 0

    @staticmethod
    async def list_workshops(
        session: AsyncSession,
        status: Optional[str] = None,
        organizer_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Tuple[Workshop, int]], int]:
        query = select(Workshop)
        count_query = select(func.count(Workshop.id))

        if status:
            query = query.where(Workshop.status == status)
            count_query = count_query.where(Workshop.status == status)

        if organizer_id:
            query = query.where(Workshop.organizer_id == organizer_id)
            count_query = count_query.where(Workshop.organizer_id == organizer_id)

        query = query.order_by(Workshop.schedule.asc()).limit(limit).offset(offset)

        total_res = await session.execute(count_query)
        total = total_res.scalar() or 0

        res = await session.execute(query)
        workshops = res.scalars().all()

        # Get registration counts for each workshop
        items: List[Tuple[Workshop, int]] = []
        for w in workshops:
            reg_count = await WorkshopService.get_confirmed_registration_count(session, w.id)
            items.append((w, reg_count))

        return items, total

    @staticmethod
    async def cancel_workshop(
        session: AsyncSession,
        workshop_id: str,
        caller_user_id: Optional[str] = None,
    ) -> Tuple[Workshop, int]:
        """
        Idempotently cancels a workshop and fans out cancellation notifications
        to all confirmed registrations within the same database transaction.
        """
        # Query with row lock when dialect supports it
        query = select(Workshop).where(Workshop.id == workshop_id)
        if session.bind and session.bind.dialect.name == "postgresql":
            query = query.with_for_update()

        result = await session.execute(query)
        workshop = result.scalar_one_or_none()
        if not workshop:
            raise WorkshopNotFoundError(workshop_id)

        # Ownership authorization check
        if caller_user_id and workshop.organizer_id and workshop.organizer_id != caller_user_id:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to cancel this workshop as it belongs to another organizer."
            )

        # Idempotency check: If already cancelled, do not regenerate notifications
        if workshop.status == WorkshopStatus.CANCELLED:
            return workshop, 0

        # Mark workshop cancelled
        now = utc_now()
        workshop.status = WorkshopStatus.CANCELLED
        workshop.cancelled_at = now

        # Fetch all confirmed registrations
        reg_stmt = select(Registration).where(
            Registration.workshop_id == workshop_id,
            Registration.status == RegistrationStatus.CONFIRMED,
        )
        reg_res = await session.execute(reg_stmt)
        confirmed_registrations = reg_res.scalars().all()

        notifications_queued = 0
        for reg in confirmed_registrations:
            # Deterministic idempotency key: cancel_{workshop_id}_{reg_id}
            idempotency_key = f"cancel_{workshop_id}_{reg.id}"

            # Check if outbox event already exists for this registration
            existing_outbox_stmt = select(NotificationOutbox).where(
                NotificationOutbox.idempotency_key == idempotency_key
            )
            existing_outbox = (await session.execute(existing_outbox_stmt)).scalar_one_or_none()

            if not existing_outbox:
                outbox_entry = NotificationOutbox(
                    workshop_id=workshop_id,
                    recipient_email=reg.member_email,
                    recipient_name=reg.member_name,
                    event_type=NotificationEventType.WORKSHOP_CANCELLATION,
                    payload={
                        "workshop_id": workshop.id,
                        "workshop_title": workshop.title,
                        "schedule": workshop.schedule.isoformat(),
                        "cancelled_at": now.isoformat(),
                        "member_id": reg.member_id,
                        "member_name": reg.member_name,
                        "reason": "Workshop was cancelled by organizer",
                    },
                    idempotency_key=idempotency_key,
                    status=NotificationStatus.PENDING,
                    attempt_count=0,
                    next_retry_at=now,
                )
                session.add(outbox_entry)
                notifications_queued += 1

        await session.commit()
        await session.refresh(workshop)
        return workshop, notifications_queued
