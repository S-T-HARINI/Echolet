from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.exceptions import NotificationNotFoundError
from backend.app.models.outbox import (
    NotificationOutbox,
    NotificationStatus,
)
from backend.app.models.workshop import Workshop
from backend.app.schemas.notification import NotificationSummaryResponse


class NotificationService:
    @staticmethod
    async def get_notification(session: AsyncSession, notification_id: str) -> NotificationOutbox:
        stmt = select(NotificationOutbox).where(NotificationOutbox.id == notification_id)
        result = await session.execute(stmt)
        notification = result.scalar_one_or_none()
        if not notification:
            raise NotificationNotFoundError(notification_id)
        return notification

    @staticmethod
    async def list_notifications(
        session: AsyncSession,
        workshop_id: Optional[str] = None,
        recipient_email: Optional[str] = None,
        status: Optional[str] = None,
        organizer_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[NotificationOutbox], int]:
        query = select(NotificationOutbox)
        count_query = select(func.count(NotificationOutbox.id))

        if organizer_id:
            query = query.join(Workshop, NotificationOutbox.workshop_id == Workshop.id).where(
                Workshop.organizer_id == organizer_id
            )
            count_query = count_query.join(Workshop, NotificationOutbox.workshop_id == Workshop.id).where(
                Workshop.organizer_id == organizer_id
            )

        if workshop_id:
            query = query.where(NotificationOutbox.workshop_id == workshop_id)
            count_query = count_query.where(NotificationOutbox.workshop_id == workshop_id)

        if recipient_email:
            query = query.where(NotificationOutbox.recipient_email == recipient_email)
            count_query = count_query.where(NotificationOutbox.recipient_email == recipient_email)

        if status:
            query = query.where(NotificationOutbox.status == status)
            count_query = count_query.where(NotificationOutbox.status == status)

        query = query.order_by(NotificationOutbox.created_at.desc()).limit(limit).offset(offset)

        total_res = await session.execute(count_query)
        total = total_res.scalar() or 0

        res = await session.execute(query)
        notifications = res.scalars().all()
        return list(notifications), total

    @staticmethod
    async def get_summary(
        session: AsyncSession,
        organizer_id: Optional[str] = None
    ) -> NotificationSummaryResponse:
        statuses = [
            NotificationStatus.PENDING,
            NotificationStatus.CLAIMED,
            NotificationStatus.RETRYING,
            NotificationStatus.DELIVERED,
            NotificationStatus.FAILED,
        ]
        counts = {}
        for s in statuses:
            stmt = select(func.count(NotificationOutbox.id)).where(NotificationOutbox.status == s)
            if organizer_id:
                stmt = stmt.join(Workshop, NotificationOutbox.workshop_id == Workshop.id).where(
                    Workshop.organizer_id == organizer_id
                )
            res = await session.execute(stmt)
            counts[s] = res.scalar() or 0

        total_stmt = select(func.count(NotificationOutbox.id))
        if organizer_id:
            total_stmt = total_stmt.join(Workshop, NotificationOutbox.workshop_id == Workshop.id).where(
                Workshop.organizer_id == organizer_id
            )
        total_res = await session.execute(total_stmt)
        total = total_res.scalar() or 0

        return NotificationSummaryResponse(
            total=total,
            pending=counts.get(NotificationStatus.PENDING, 0),
            claimed=counts.get(NotificationStatus.CLAIMED, 0),
            retrying=counts.get(NotificationStatus.RETRYING, 0),
            delivered=counts.get(NotificationStatus.DELIVERED, 0),
            failed=counts.get(NotificationStatus.FAILED, 0),
        )
