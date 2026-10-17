from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.exceptions import (
    DuplicateRegistrationError,
    WorkshopCancelledError,
    WorkshopCapacityExceededError,
    WorkshopNotFoundError,
)
from backend.app.models.base import utc_now
from backend.app.models.outbox import (
    NotificationEventType,
    NotificationOutbox,
    NotificationStatus,
)
from backend.app.models.registration import Registration, RegistrationStatus
from backend.app.models.workshop import Workshop, WorkshopStatus
from backend.app.schemas.registration import RegistrationCreate


class RegistrationService:
    @staticmethod
    async def register_member(
        session: AsyncSession,
        workshop_id: str,
        data: RegistrationCreate,
    ) -> Tuple[Registration, NotificationOutbox]:
        """
        Atomically registers a member for a workshop and creates a pending
        outbox confirmation event within the exact same database transaction.
        Enforces:
        - Workshop existence and active (SCHEDULED) state
        - Concurrency-safe capacity enforcement
        - Duplicate prevention via DB constraint + application check
        - Outbox atomicity: both registration & outbox commit or rollback together.
        """
        # 1. First, check for duplicate registration for this member on this workshop
        dup_query = select(Registration).where(
            Registration.workshop_id == workshop_id,
            Registration.member_id == data.member_id,
        )
        dup_res = await session.execute(dup_query)
        if dup_res.scalar_one_or_none() is not None:
            raise DuplicateRegistrationError(
                f"Member '{data.member_id}' is already registered for workshop '{workshop_id}'"
            )

        # 2. Atomic capacity reservation and active state check at DB engine level
        from sqlalchemy import update
        reserve_stmt = (
            update(Workshop)
            .where(
                Workshop.id == workshop_id,
                Workshop.status == WorkshopStatus.SCHEDULED,
                Workshop.current_registrations < Workshop.capacity,
            )
            .values(current_registrations=Workshop.current_registrations + 1)
        )
        res = await session.execute(reserve_stmt)
        if res.rowcount == 0:
            # Determine specific rejection reason
            w_stmt = select(Workshop).where(Workshop.id == workshop_id)
            w_res = await session.execute(w_stmt)
            workshop = w_res.scalar_one_or_none()
            if not workshop:
                raise WorkshopNotFoundError(workshop_id)
            if workshop.status == WorkshopStatus.CANCELLED:
                raise WorkshopCancelledError("Cannot register for a cancelled workshop")
            raise WorkshopCapacityExceededError(
                f"Workshop '{workshop.title}' has reached its maximum capacity of {workshop.capacity}"
            )

        # Fetch workshop details for notification payload
        w_stmt = select(Workshop).where(Workshop.id == workshop_id)
        w_res = await session.execute(w_stmt)
        workshop = w_res.scalar_one()

        # 4. Create registration record
        now = utc_now()
        registration = Registration(
            workshop_id=workshop_id,
            member_id=data.member_id,
            member_name=data.member_name,
            member_email=data.member_email,
            status=RegistrationStatus.CONFIRMED,
            registered_at=now,
        )
        session.add(registration)

        # Flush to generate registration.id before building outbox entry
        try:
            await session.flush()
        except IntegrityError as exc:
            await session.rollback()
            raise DuplicateRegistrationError(
                f"Member '{data.member_id}' is already registered for this workshop (unique constraint)"
            ) from exc

        # 5. Create NotificationOutbox entry in the SAME transaction
        idempotency_key = f"reg_{registration.id}"
        outbox_event = NotificationOutbox(
            workshop_id=workshop_id,
            recipient_email=data.member_email,
            recipient_name=data.member_name,
            event_type=NotificationEventType.WORKSHOP_REGISTRATION_CONFIRMATION,
            payload={
                "workshop_id": workshop.id,
                "workshop_title": workshop.title,
                "schedule": workshop.schedule.isoformat(),
                "registration_id": registration.id,
                "member_id": data.member_id,
                "member_name": data.member_name,
            },
            idempotency_key=idempotency_key,
            status=NotificationStatus.PENDING,
            attempt_count=0,
            next_retry_at=now,
        )
        session.add(outbox_event)

        # 6. Atomic commit of BOTH registration and outbox event
        try:
            await session.commit()
        except Exception:
            await session.rollback()
            raise

        return registration, outbox_event

    @staticmethod
    async def list_registrations(
        session: AsyncSession,
        workshop_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Registration], int]:
        # Verify workshop exists
        workshop_stmt = select(Workshop).where(Workshop.id == workshop_id)
        w_res = await session.execute(workshop_stmt)
        if not w_res.scalar_one_or_none():
            raise WorkshopNotFoundError(workshop_id)

        query = (
            select(Registration)
            .where(Registration.workshop_id == workshop_id)
            .order_by(Registration.registered_at.desc())
            .limit(limit)
            .offset(offset)
        )
        count_query = select(func.count(Registration.id)).where(
            Registration.workshop_id == workshop_id
        )

        total_res = await session.execute(count_query)
        total = total_res.scalar() or 0

        res = await session.execute(query)
        registrations = res.scalars().all()
        return list(registrations), total

    @staticmethod
    async def list_all_registrations(
        session: AsyncSession,
        workshop_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[dict], int]:
        query = (
            select(
                Registration,
                Workshop.title.label("workshop_title"),
                Workshop.status.label("workshop_status"),
            )
            .join(Workshop, Registration.workshop_id == Workshop.id)
            .order_by(Registration.registered_at.desc())
        )
        count_query = select(func.count(Registration.id))

        if workshop_id:
            query = query.where(Registration.workshop_id == workshop_id)
            count_query = count_query.where(Registration.workshop_id == workshop_id)

        query = query.limit(limit).offset(offset)
        total_res = await session.execute(count_query)
        total = total_res.scalar() or 0

        res = await session.execute(query)
        rows = res.all()

        items = []
        for reg, w_title, w_status in rows:
            items.append({
                "id": reg.id,
                "workshop_id": reg.workshop_id,
                "workshop_title": w_title,
                "workshop_status": w_status,
                "member_id": reg.member_id,
                "member_name": reg.member_name,
                "member_email": reg.member_email,
                "status": reg.status,
                "registered_at": reg.registered_at,
            })
        return items, total
