from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import func, select
from backend.app.models.outbox import (
    NotificationEventType,
    NotificationOutbox,
    NotificationStatus,
)
from backend.app.models.workshop import Workshop, WorkshopStatus


@pytest.mark.asyncio
async def test_workshop_cancellation_fanout(client, test_session):
    future_date = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
    w_res = await client.post(
        "/api/v1/workshops",
        json={"title": "Security Architecture", "schedule": future_date, "capacity": 10},
    )
    workshop_id = w_res.json()["id"]

    # Register 3 members
    for i in range(1, 4):
        reg_res = await client.post(
            f"/api/v1/workshops/{workshop_id}/registrations",
            json={
                "member_id": f"sec-member-{i}",
                "member_name": f"Attendee {i}",
                "member_email": f"attendee{i}@example.com",
            },
        )
        assert reg_res.status_code == 201

    # Cancel workshop
    cancel_res = await client.post(f"/api/v1/workshops/{workshop_id}/cancel")
    assert cancel_res.status_code == 200
    cancel_data = cancel_res.json()
    assert cancel_data["status"] == WorkshopStatus.CANCELLED
    assert cancel_data["notifications_queued"] == 3

    # Verify outbox has 3 cancellation events + 3 registration events
    cancel_events = (
        await test_session.execute(
            select(NotificationOutbox).where(
                NotificationOutbox.workshop_id == workshop_id,
                NotificationOutbox.event_type == NotificationEventType.WORKSHOP_CANCELLATION,
            )
        )
    ).scalars().all()

    assert len(cancel_events) == 3
    recipients = {ev.recipient_email for ev in cancel_events}
    assert recipients == {
        "attendee1@example.com",
        "attendee2@example.com",
        "attendee3@example.com",
    }
    for ev in cancel_events:
        assert ev.status == NotificationStatus.PENDING
        assert ev.idempotency_key.startswith(f"cancel_{workshop_id}_")

    # Verify subsequent registration is rejected
    post_cancel_reg = await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={"member_id": "late-member", "member_name": "Late User", "member_email": "late@example.com"},
    )
    assert post_cancel_reg.status_code == 400
    assert "cancelled" in post_cancel_reg.json()["detail"].lower()


@pytest.mark.asyncio
async def test_repeated_cancellation_is_idempotent(client, test_session):
    future_date = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
    w_res = await client.post(
        "/api/v1/workshops",
        json={"title": "Idempotent Cancellation", "schedule": future_date, "capacity": 5},
    )
    workshop_id = w_res.json()["id"]

    await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={"member_id": "idemp-1", "member_name": "Member 1", "member_email": "m1@example.com"},
    )

    # First cancellation
    c1 = await client.post(f"/api/v1/workshops/{workshop_id}/cancel")
    assert c1.status_code == 200
    assert c1.json()["notifications_queued"] == 1

    # Second cancellation (idempotent call)
    c2 = await client.post(f"/api/v1/workshops/{workshop_id}/cancel")
    assert c2.status_code == 200
    assert c2.json()["notifications_queued"] == 0

    # Total cancellation notifications in DB remains 1
    cancel_count = (
        await test_session.execute(
            select(func.count(NotificationOutbox.id)).where(
                NotificationOutbox.workshop_id == workshop_id,
                NotificationOutbox.event_type == NotificationEventType.WORKSHOP_CANCELLATION,
            )
        )
    ).scalar()
    assert cancel_count == 1
