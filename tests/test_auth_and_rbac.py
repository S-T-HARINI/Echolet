import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.app.database import get_db_session
from backend.app.main import app as backend_app
from backend.app.models.user import UserRole


@pytest_asyncio.fixture(scope="function")
async def raw_client(test_engine):
    """
    Client without auth dependency overrides, so real auth and RBAC logic is tested.
    """
    session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
            finally:
                await session.close()

    backend_app.dependency_overrides[get_db_session] = override_get_db

    transport = ASGITransport(app=backend_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    backend_app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_signup_login_and_logout_flow(raw_client):
    # 1. Signup new member
    signup_res = await raw_client.post(
        "/api/v1/auth/signup",
        json={
            "name": "Alice Tester",
            "email": "alice@example.com",
            "password": "SecurePassword123!",
            "role": "MEMBER",
        },
    )
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert signup_data["user"]["email"] == "alice@example.com"
    assert signup_data["user"]["role"] == "MEMBER"
    assert "token" in signup_data
    token = signup_data["token"]
    assert "echolet_session" in signup_res.cookies

    # 2. Duplicate signup should be rejected
    dup_res = await raw_client.post(
        "/api/v1/auth/signup",
        json={
            "name": "Alice Duplicate",
            "email": "alice@example.com",
            "password": "AnotherPassword123!",
            "role": "MEMBER",
        },
    )
    assert dup_res.status_code == 409

    # 3. GET /me with Bearer token
    me_res = await raw_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "alice@example.com"

    # 4. Logout invalidates session
    logout_res = await raw_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_res.status_code == 200

    # 5. Subsequent /me should be 401
    me_after_logout = await raw_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_after_logout.status_code == 401

    # 6. Login with correct password
    login_res = await raw_client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["email"] == "alice@example.com"

    # 7. Login with invalid password
    bad_login = await raw_client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401


@pytest.mark.asyncio
async def test_unauthenticated_requests_blocked(raw_client):
    # API endpoints require authentication
    res1 = await raw_client.post(
        "/api/v1/workshops",
        json={"title": "Unauthorized Workshop", "schedule": "2030-01-01T10:00:00Z", "capacity": 10},
    )
    assert res1.status_code == 401

    res2 = await raw_client.get("/api/v1/workshops")
    assert res2.status_code == 401

    res3 = await raw_client.get("/api/v1/registrations")
    assert res3.status_code == 401

    res4 = await raw_client.get("/api/v1/notifications/outbox")
    assert res4.status_code == 401

    res5 = await raw_client.get("/api/v1/notifications/summary")
    assert res5.status_code == 401


@pytest.mark.asyncio
async def test_role_based_access_control_member_restrictions(raw_client):
    # Create Organizer
    org_res = await raw_client.post(
        "/api/v1/auth/signup",
        json={
            "name": "Organizer Bob",
            "email": "bob.org@example.com",
            "password": "Password123!",
            "role": "ORGANIZER",
        },
    )
    assert org_res.status_code == 201
    org_token = org_res.json()["token"]

    # Organizer creates workshop
    future_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    w_res = await raw_client.post(
        "/api/v1/workshops",
        headers={"Authorization": f"Bearer {org_token}"},
        json={"title": "High Throughput Systems", "schedule": future_date, "capacity": 20},
    )
    assert w_res.status_code == 201
    workshop_id = w_res.json()["id"]

    # Create Member
    mem_res = await raw_client.post(
        "/api/v1/auth/signup",
        json={
            "name": "Member Charlie",
            "email": "charlie.mem@example.com",
            "password": "Password123!",
            "role": "MEMBER",
        },
    )
    assert mem_res.status_code == 201
    mem_token = mem_res.json()["token"]

    # Member attempts to create workshop -> 403 Forbidden
    mem_create = await raw_client.post(
        "/api/v1/workshops",
        headers={"Authorization": f"Bearer {mem_token}"},
        json={"title": "Illegal Member Workshop", "schedule": future_date, "capacity": 10},
    )
    assert mem_create.status_code == 403

    # Member attempts to cancel workshop -> 403 Forbidden
    mem_cancel = await raw_client.post(
        f"/api/v1/workshops/{workshop_id}/cancel",
        headers={"Authorization": f"Bearer {mem_token}"},
    )
    assert mem_cancel.status_code == 403

    # Member attempts to view workshop attendee roster -> 403 Forbidden
    mem_roster = await raw_client.get(
        f"/api/v1/workshops/{workshop_id}/registrations",
        headers={"Authorization": f"Bearer {mem_token}"},
    )
    assert mem_roster.status_code == 403

    # Member attempts to view outbox notifications -> 403 Forbidden
    mem_outbox = await raw_client.get(
        "/api/v1/notifications/outbox",
        headers={"Authorization": f"Bearer {mem_token}"},
    )
    assert mem_outbox.status_code == 403

    # Member CAN register for the workshop -> 201 Created
    reg_res = await raw_client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        headers={"Authorization": f"Bearer {mem_token}"},
        json={
            "member_id": "mem_charlie",
            "member_name": "Charlie",
            "member_email": "charlie.mem@example.com",
        },
    )
    assert reg_res.status_code == 201


@pytest.mark.asyncio
async def test_idor_and_data_isolation_between_organizers(raw_client):
    # Organizer 1 signs up and creates Workshop 1
    org1_res = await raw_client.post(
        "/api/v1/auth/signup",
        json={"name": "Org One", "email": "org1@example.com", "password": "Password123!", "role": "ORGANIZER"},
    )
    org1_token = org1_res.json()["token"]

    future_date = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    w1_res = await raw_client.post(
        "/api/v1/workshops",
        headers={"Authorization": f"Bearer {org1_token}"},
        json={"title": "Org 1 Confidential Workshop", "schedule": future_date, "capacity": 15},
    )
    w1_id = w1_res.json()["id"]

    # Organizer 2 signs up
    org2_res = await raw_client.post(
        "/api/v1/auth/signup",
        json={"name": "Org Two", "email": "org2@example.com", "password": "Password123!", "role": "ORGANIZER"},
    )
    org2_token = org2_res.json()["token"]

    # Organizer 2 attempts IDOR cancel on Workshop 1 -> 403 Forbidden
    idor_cancel = await raw_client.post(
        f"/api/v1/workshops/{w1_id}/cancel",
        headers={"Authorization": f"Bearer {org2_token}"},
    )
    assert idor_cancel.status_code == 403
    assert "belongs to another organizer" in idor_cancel.json()["detail"]

    # Organizer 2 list_workshops defaults to only their workshops
    org2_list = await raw_client.get(
        "/api/v1/workshops",
        headers={"Authorization": f"Bearer {org2_token}"},
    )
    assert org2_list.status_code == 200
    assert len(org2_list.json()) == 0  # Org 2 has created 0 workshops yet


@pytest.mark.asyncio
async def test_member_registration_isolation(raw_client):
    # Organizer creates workshop
    org_res = await raw_client.post(
        "/api/v1/auth/signup",
        json={"name": "Event Master", "email": "eventmaster@example.com", "password": "Password123!", "role": "ORGANIZER"},
    )
    org_token = org_res.json()["token"]

    future_date = (datetime.now(timezone.utc) + timedelta(days=12)).isoformat()
    w_res = await raw_client.post(
        "/api/v1/workshops",
        headers={"Authorization": f"Bearer {org_token}"},
        json={"title": "Kafka & Outbox Deep Dive", "schedule": future_date, "capacity": 30},
    )
    w_id = w_res.json()["id"]

    # Member 1 signs up & registers
    m1_res = await raw_client.post(
        "/api/v1/auth/signup",
        json={"name": "Member One", "email": "m1@example.com", "password": "Password123!", "role": "MEMBER"},
    )
    m1_token = m1_res.json()["token"]

    await raw_client.post(
        f"/api/v1/workshops/{w_id}/registrations",
        headers={"Authorization": f"Bearer {m1_token}"},
        json={"member_id": "m1_id", "member_name": "Member One", "member_email": "m1@example.com"},
    )

    # Member 2 signs up & registers
    m2_res = await raw_client.post(
        "/api/v1/auth/signup",
        json={"name": "Member Two", "email": "m2@example.com", "password": "Password123!", "role": "MEMBER"},
    )
    m2_token = m2_res.json()["token"]

    await raw_client.post(
        f"/api/v1/workshops/{w_id}/registrations",
        headers={"Authorization": f"Bearer {m2_token}"},
        json={"member_id": "m2_id", "member_name": "Member Two", "member_email": "m2@example.com"},
    )

    # Member 1 lists registrations -> only sees m1
    m1_regs = await raw_client.get(
        "/api/v1/registrations",
        headers={"Authorization": f"Bearer {m1_token}"},
    )
    assert m1_regs.status_code == 200
    m1_data = m1_regs.json()
    assert len(m1_data) == 1
    assert m1_data[0]["member_email"] == "m1@example.com"

    # Member 2 lists registrations -> only sees m2
    m2_regs = await raw_client.get(
        "/api/v1/registrations",
        headers={"Authorization": f"Bearer {m2_token}"},
    )
    assert m2_regs.status_code == 200
    m2_data = m2_regs.json()
    assert len(m2_data) == 1
    assert m2_data[0]["member_email"] == "m2@example.com"
