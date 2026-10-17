from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db_session
from backend.app.exceptions import EchoLetException
from backend.app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    NotificationSummaryResponse,
)
from backend.app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications Outbox"])


@router.get(
    "/summary",
    response_model=NotificationSummaryResponse,
    summary="Get notification outbox status summary",
    description="Retrieve aggregate counts of notifications by status (pending, claimed, retrying, delivered, failed).",
)
async def get_notification_summary(
    db: AsyncSession = Depends(get_db_session),
) -> NotificationSummaryResponse:
    return await NotificationService.get_summary(db)


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List outbox notifications",
    description="Retrieve a paginated list of notification outbox records with optional status, workshop, and recipient filters.",
)
async def list_notifications(
    workshop_id: Optional[str] = Query(None, description="Filter by workshop ID"),
    recipient_email: Optional[str] = Query(None, description="Filter by recipient email"),
    status: Optional[str] = Query(None, description="Filter by status (PENDING, CLAIMED, DELIVERED, RETRYING, FAILED)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> NotificationListResponse:
    items, total = await NotificationService.list_notifications(
        db,
        workshop_id=workshop_id,
        recipient_email=recipient_email,
        status=status,
        limit=limit,
        offset=offset,
    )
    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
    summary="Get single notification outbox event details",
    description="Retrieve full details for an outbox event including delivery status, attempt counts, and error history.",
)
async def get_notification(
    notification_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> NotificationResponse:
    try:
        notification = await NotificationService.get_notification(db, notification_id)
        return NotificationResponse.model_validate(notification)
    except EchoLetException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
