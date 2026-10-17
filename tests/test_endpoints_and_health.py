from datetime import datetime, timedelta, timezone
import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["app_name"] == "EchoLet API"
    assert "pending_notifications" in data


@pytest.mark.asyncio
async def test_notification_summary_and_filters(client):
    # Create workshop and register 2 members
    future_date = (datetime.now(timezone.utc) + timedelta(days=8)).isoformat()
    w_res = await client.post(
        "/api/v1/workshops",
        json={"title": "Filtered Notifications Workshop", "schedule": future_date, "capacity": 10},
    )
    workshop_id = w_res.json()["id"]

    await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={"member_id": "filter-1", "member_name": "Filter One", "member_email": "f1@example.com"},
    )
    await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={"member_id": "filter-2", "member_name": "Filter Two", "member_email": "f2@example.com"},
    )

    # Check summary endpoint
    summary_res = await client.get("/api/v1/notifications/summary")
    assert summary_res.status_code == 200
    sum_data = summary_res.json()
    assert sum_data["total"] >= 2
    assert sum_data["pending"] >= 2

    # Check listing with filters
    list_res = await client.get(f"/api/v1/notifications?workshop_id={workshop_id}&status=PENDING")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 2
    assert len(list_data["items"]) == 2

    # Check recipient filter
    rec_res = await client.get(f"/api/v1/notifications?recipient_email=f1@example.com")
    assert rec_res.status_code == 200
    assert rec_res.json()["total"] == 1


@pytest.mark.asyncio
async def test_list_workshop_registrations(client):
    future_date = (datetime.now(timezone.utc) + timedelta(days=8)).isoformat()
    w_res = await client.post(
        "/api/v1/workshops",
        json={"title": "Registrations List Workshop", "schedule": future_date, "capacity": 5},
    )
    workshop_id = w_res.json()["id"]

    await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={"member_id": "list-mem-1", "member_name": "List User", "member_email": "list@example.com"},
    )

    reg_list_res = await client.get(f"/api/v1/workshops/{workshop_id}/registrations")
    assert reg_list_res.status_code == 200
    regs = reg_list_res.json()
    assert len(regs) == 1
    assert regs[0]["member_id"] == "list-mem-1"
