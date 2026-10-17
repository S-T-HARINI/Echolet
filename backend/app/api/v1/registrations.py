from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db_session
from backend.app.exceptions import EchoLetException
from backend.app.schemas.registration import RegistrationCreate, RegistrationResponse
from backend.app.services.registration_service import RegistrationService

router = APIRouter(prefix="/workshops/{workshop_id}/registrations", tags=["Registrations"])


@router.post(
    "",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a member for a workshop",
    description=(
        "Registers a member for an active workshop and transactionally creates a pending "
        "confirmation notification in the outbox. Returns immediately without waiting for HTTP delivery."
    ),
)
async def register_member(
    workshop_id: str,
    payload: RegistrationCreate,
    db: AsyncSession = Depends(get_db_session),
) -> RegistrationResponse:
    try:
        registration, outbox_event = await RegistrationService.register_member(
            db, workshop_id, payload
        )
        return RegistrationResponse(
            id=registration.id,
            workshop_id=registration.workshop_id,
            member_id=registration.member_id,
            member_name=registration.member_name,
            member_email=registration.member_email,
            status=registration.status,
            registered_at=registration.registered_at,
            notification_id=outbox_event.id,
            notification_status=outbox_event.status,
            message="Registration accepted and persisted. Confirmation notification queued in outbox.",
        )
    except EchoLetException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get(
    "",
    response_model=List[dict],
    summary="List registrations for a workshop",
    description="Retrieve all confirmed member registrations for a specific workshop.",
)
async def list_registrations(
    workshop_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> List[dict]:
    try:
        registrations, _ = await RegistrationService.list_registrations(
            db, workshop_id, limit=limit, offset=offset
        )
        return [
            {
                "id": r.id,
                "workshop_id": r.workshop_id,
                "member_id": r.member_id,
                "member_name": r.member_name,
                "member_email": r.member_email,
                "status": r.status,
                "registered_at": r.registered_at,
            }
            for r in registrations
        ]
    except EchoLetException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
