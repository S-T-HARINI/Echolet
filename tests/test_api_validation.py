from datetime import datetime, timedelta, timezone
import pytest


@pytest.mark.asyncio
async def test_workshop_validation_invalid_past_date(client):
    past_date = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    response = await client.post(
        "/api/v1/workshops",
        json={
            "title": "Past Workshop",
            "description": "Should fail",
            "schedule": past_date,
            "capacity": 25,
        },
    )
    assert response.status_code == 422
    assert "Workshop schedule must be a future date and time" in response.text


@pytest.mark.asyncio
async def test_workshop_validation_invalid_capacity(client):
    future_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    response = await client.post(
        "/api/v1/workshops",
        json={
            "title": "Invalid Capacity Workshop",
            "description": "Should fail",
            "schedule": future_date,
            "capacity": 0,
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_workshop_validation_blank_title(client):
    future_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    response = await client.post(
        "/api/v1/workshops",
        json={
            "title": "   ",
            "description": "Should fail",
            "schedule": future_date,
            "capacity": 20,
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_and_get_valid_workshop(client):
    future_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    response = await client.post(
        "/api/v1/workshops",
        json={
            "title": "Advanced FastAPI Patterns",
            "description": "Building high-performance async backends",
            "schedule": future_date,
            "capacity": 30,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Advanced FastAPI Patterns"
    assert data["capacity"] == 30
    assert data["status"] == "SCHEDULED"
    assert data["registered_count"] == 0
    assert data["available_capacity"] == 30
    workshop_id = data["id"]

    # Retrieve by ID
    get_res = await client.get(f"/api/v1/workshops/{workshop_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == workshop_id


@pytest.mark.asyncio
async def test_workshop_not_found(client):
    response = await client.get("/api/v1/workshops/non-existent-uuid")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_registration_validation_invalid_email(client):
    future_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    create_res = await client.post(
        "/api/v1/workshops",
        json={"title": "Test Workshop", "schedule": future_date, "capacity": 10},
    )
    workshop_id = create_res.json()["id"]

    reg_res = await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={"member_id": "mem-1", "member_name": "Alice", "member_email": "not-an-email"},
    )
    assert reg_res.status_code == 422
