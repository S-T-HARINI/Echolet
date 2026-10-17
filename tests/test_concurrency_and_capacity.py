import asyncio
from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import func, select
from backend.app.models.outbox import NotificationOutbox
from backend.app.models.registration import Registration


@pytest.mark.asyncio
async def test_capacity_enforcement(client, test_session):
    future_date = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    w_res = await client.post(
        "/api/v1/workshops",
        json={"title": "Small Workshop", "schedule": future_date, "capacity": 2},
    )
    workshop_id = w_res.json()["id"]

    # Register member 1
    r1 = await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={"member_id": "m1", "member_name": "User 1", "member_email": "u1@example.com"},
    )
    assert r1.status_code == 201

    # Register member 2
    r2 = await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={"member_id": "m2", "member_name": "User 2", "member_email": "u2@example.com"},
    )
    assert r2.status_code == 201

    # Register member 3 (exceeds capacity)
    r3 = await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={"member_id": "m3", "member_name": "User 3", "member_email": "u3@example.com"},
    )
    assert r3.status_code == 409
    assert "capacity" in r3.json()["detail"].lower()

    # Verify counts
    reg_count = (
        await test_session.execute(
            select(func.count(Registration.id)).where(Registration.workshop_id == workshop_id)
        )
    ).scalar()
    assert reg_count == 2

    notif_count = (
        await test_session.execute(
            select(func.count(NotificationOutbox.id)).where(
                NotificationOutbox.workshop_id == workshop_id
            )
        )
    ).scalar()
    assert notif_count == 2


@pytest.mark.asyncio
async def test_concurrent_registrations_limit_to_capacity(client, test_session, test_session_factory):
    future_date = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
    capacity = 3
    w_res = await client.post(
        "/api/v1/workshops",
        json={"title": "Concurrent Race Workshop", "schedule": future_date, "capacity": capacity},
    )
    workshop_id = w_res.json()["id"]

    # Simulate 8 concurrent registration attempts for 3 available seats
    async def try_register(idx: int):
        return await client.post(
            f"/api/v1/workshops/{workshop_id}/registrations",
            json={
                "member_id": f"race-member-{idx}",
                "member_name": f"Race User {idx}",
                "member_email": f"race{idx}@example.com",
            },
        )

    responses = await asyncio.gather(*(try_register(i) for i in range(8)))

    successes = [r for r in responses if r.status_code == 201]
    capacity_failures = [r for r in responses if r.status_code == 409]

    assert len(successes) == capacity
    assert len(capacity_failures) == 8 - capacity

    # DB verified via fresh session
    async with test_session_factory() as verify_session:
        reg_count = (
            await verify_session.execute(
                select(func.count(Registration.id)).where(Registration.workshop_id == workshop_id)
            )
        ).scalar()
        assert reg_count == capacity
