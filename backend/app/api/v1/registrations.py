from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.auth.dependencies import get_current_user
from backend.app.database import get_db_session
from backend.app.exceptions import EchoLetException
from backend.app.models.user import User
from backend.app.schemas.registration import RegistrationCreate, RegistrationResponse
from backend.app.services.registration_service import RegistrationService
from backend.app.services.workshop_service import WorkshopService

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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> RegistrationResponse:
    try:
        # If caller is a member, bind member info to authenticated user
        if current_user.is_member():
            payload.member_id = current_user.id
            payload.member_name = current_user.name
            payload.member_email = current_user.email

        registration, outbox_event = await RegistrationService.register_member(
            db, workshop_id, payload, user_id=current_user.id
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
    description="Retrieve confirmed member registrations for a specific workshop. Accessible only by workshop organizer.",
)
async def list_registrations(
    workshop_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> List[dict]:
    try:
        # Check authorization: only the workshop's organizer can view attendee roster
        workshop = await WorkshopService.get_workshop(db, workshop_id)
        if current_user.is_organizer() and workshop.organizer_id and workshop.organizer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view the attendee roster for this workshop.",
            )
        elif current_user.is_member():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Members cannot view the attendee roster for workshops.",
            )

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


global_registrations_router = APIRouter(prefix="/registrations", tags=["Registrations"])


@global_registrations_router.get(
    "",
    response_model=List[dict],
    summary="List registrations with user data isolation",
    description=(
        "Retrieve registrations with strict role-based data isolation. "
        "Members only see their own registrations. "
        "Organizers see registrations for workshops they manage."
    ),
)
async def list_all_registrations(
    workshop_id: Optional[str] = Query(None, description="Filter by workshop ID"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> List[dict]:
    # Enforce data isolation based on role
    user_filter = None
    organizer_filter = None

    if current_user.is_member():
        user_filter = current_user.id
    elif current_user.is_organizer():
        organizer_filter = current_user.id

    items, _ = await RegistrationService.list_all_registrations(
        db,
        workshop_id=workshop_id,
        user_id=user_filter,
        organizer_id=organizer_filter,
        limit=limit,
        offset=offset
    )
    return items
