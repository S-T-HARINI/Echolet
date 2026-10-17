from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db_session
from backend.app.exceptions import EchoLetException, WorkshopNotFoundError
from backend.app.schemas.workshop import (
    WorkshopCancelResponse,
    WorkshopCreate,
    WorkshopResponse,
)
from backend.app.services.workshop_service import WorkshopService

router = APIRouter(prefix="/workshops", tags=["Workshops"])


@router.post(
    "",
    response_model=WorkshopResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workshop",
    description="Creates a new workshop with specified capacity and future schedule.",
)
async def create_workshop(
    payload: WorkshopCreate,
    db: AsyncSession = Depends(get_db_session),
) -> WorkshopResponse:
    try:
        workshop = await WorkshopService.create_workshop(db, payload)
        return WorkshopResponse(
            id=workshop.id,
            title=workshop.title,
            description=workshop.description,
            schedule=workshop.schedule,
            capacity=workshop.capacity,
            status=workshop.status,
            cancelled_at=workshop.cancelled_at,
            registered_count=0,
            available_capacity=workshop.capacity,
            created_at=workshop.created_at,
            updated_at=workshop.updated_at,
        )
    except EchoLetException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get(
    "",
    response_model=List[WorkshopResponse],
    summary="List all workshops",
    description="Retrieve a list of workshops with current registration count and available capacity.",
)
async def list_workshops(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by workshop status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> List[WorkshopResponse]:
    items, _ = await WorkshopService.list_workshops(db, status=status_filter, limit=limit, offset=offset)
    results = []
    for workshop, reg_count in items:
        results.append(
            WorkshopResponse(
                id=workshop.id,
                title=workshop.title,
                description=workshop.description,
                schedule=workshop.schedule,
                capacity=workshop.capacity,
                status=workshop.status,
                cancelled_at=workshop.cancelled_at,
                registered_count=reg_count,
                available_capacity=max(0, workshop.capacity - reg_count),
                created_at=workshop.created_at,
                updated_at=workshop.updated_at,
            )
        )
    return results


@router.get(
    "/{workshop_id}",
    response_model=WorkshopResponse,
    summary="Get workshop details",
    description="Retrieve detailed information for a specific workshop including live capacity.",
)
async def get_workshop(
    workshop_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> WorkshopResponse:
    try:
        workshop = await WorkshopService.get_workshop(db, workshop_id)
        reg_count = await WorkshopService.get_confirmed_registration_count(db, workshop_id)
        return WorkshopResponse(
            id=workshop.id,
            title=workshop.title,
            description=workshop.description,
            schedule=workshop.schedule,
            capacity=workshop.capacity,
            status=workshop.status,
            cancelled_at=workshop.cancelled_at,
            registered_count=reg_count,
            available_capacity=max(0, workshop.capacity - reg_count),
            created_at=workshop.created_at,
            updated_at=workshop.updated_at,
        )
    except EchoLetException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post(
    "/{workshop_id}/cancel",
    response_model=WorkshopCancelResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancel a workshop",
    description="Cancels an active workshop and transactionally queues cancellation notifications for all registered members.",
)
async def cancel_workshop(
    workshop_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> WorkshopCancelResponse:
    try:
        workshop, queued_count = await WorkshopService.cancel_workshop(db, workshop_id)
        return WorkshopCancelResponse(
            id=workshop.id,
            title=workshop.title,
            status=workshop.status,
            cancelled_at=workshop.cancelled_at,
            notifications_queued=queued_count,
            message=f"Workshop successfully cancelled. {queued_count} cancellation notification(s) queued.",
        )
    except EchoLetException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
