from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import func, select
from backend.app.models.outbox import (
    NotificationEventType,
    NotificationOutbox,
    NotificationStatus,
)
from backend.app.models.registration import Registration, RegistrationStatus


@pytest.mark.asyncio
async def test_successful_registration_creates_outbox_event(client, test_session):
    future_date = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    w_res = await client.post(
        "/api/v1/workshops",
        json={"title": "Cloud Systems", "schedule": future_date, "capacity": 15},
    )
    assert w_res.status_code == 201
    workshop_id = w_res.json()["id"]

    reg_res = await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={
            "member_id": "member-101",
            "member_name": "John Doe",
            "member_email": "john.doe@example.com",
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["status"] == "CONFIRMED"
    assert reg_data["notification_status"] == "PENDING"
    notification_id = reg_data["notification_id"]

    # Verify directly in the test database
    notif_stmt = select(NotificationOutbox).where(NotificationOutbox.id == notification_id)
    notif_res = await test_session.execute(notif_stmt)
    notif = notif_res.scalar_one_or_none()

    assert notif is not None
    assert notif.workshop_id == workshop_id
    assert notif.recipient_email == "john.doe@example.com"
    assert notif.recipient_name == "John Doe"
    assert notif.event_type == NotificationEventType.WORKSHOP_REGISTRATION_CONFIRMATION
    assert notif.status == NotificationStatus.PENDING
    assert notif.idempotency_key == f"reg_{reg_data['id']}"
    assert notif.attempt_count == 0


@pytest.mark.asyncio
async def test_duplicate_registration_rejected_and_no_duplicate_outbox(client, test_session):
    future_date = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    w_res = await client.post(
        "/api/v1/workshops",
        json={"title": "Distributed Storage", "schedule": future_date, "capacity": 10},
    )
    workshop_id = w_res.json()["id"]

    payload = {
        "member_id": "member-dup",
        "member_name": "Bob Smith",
        "member_email": "bob@example.com",
    }

    # First registration
    res1 = await client.post(f"/api/v1/workshops/{workshop_id}/registrations", json=payload)
    assert res1.status_code == 201

    # Second registration for same workshop and member
    res2 = await client.post(f"/api/v1/workshops/{workshop_id}/registrations", json=payload)
    assert res2.status_code == 409
    assert "already registered" in res2.json()["detail"].lower()

    # Verify only ONE registration and ONE outbox record exist
    reg_count = (
        await test_session.execute(
            select(func.count(Registration.id)).where(Registration.workshop_id == workshop_id)
        )
    ).scalar()
    assert reg_count == 1

    outbox_count = (
        await test_session.execute(
            select(func.count(NotificationOutbox.id)).where(
                NotificationOutbox.workshop_id == workshop_id
            )
        )
    ).scalar()
    assert outbox_count == 1


@pytest.mark.asyncio
async def test_registration_to_non_existent_workshop_creates_no_outbox(client, test_session):
    res = await client.post(
        "/api/v1/workshops/missing-workshop-uuid/registrations",
        json={"member_id": "m1", "member_name": "Eve", "member_email": "eve@example.com"},
    )
    assert res.status_code == 404

    # Verify no outbox record exists
    outbox_count = (await test_session.execute(select(func.count(NotificationOutbox.id)))).scalar()
    assert outbox_count == 0
