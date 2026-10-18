import pytest
from datetime import datetime, timezone, timedelta
import random
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.app.database import get_db_session
from backend.app.main import app as backend_app


@pytest.mark.asyncio
async def test_workshop_creation_and_member_visibility(test_engine):
    tag = random.randint(10000, 99999)

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
    async with AsyncClient(transport=transport, base_url="http://testserver/api/v1") as org_c, \
               AsyncClient(transport=transport, base_url="http://testserver/api/v1") as mem_c:
        # 1. Fresh Organizer Account Has Exactly 0 Workshops
        r = await org_c.post('/auth/signup', json={
            'email': f'org.verify.{tag}@example.com',
            'password': 'SecurePassword123!',
            'name': 'Test Organizer',
            'role': 'ORGANIZER'
        })
        assert r.status_code == 201, f'Org signup failed: {r.text}'
        org_token = r.json()['token']
        org_c.headers['Authorization'] = f'Bearer {org_token}'

        r = await org_c.get('/workshops')
        assert r.status_code == 200
        org_workshops = r.json()
        assert len(org_workshops) == 0, 'Fresh organizer MUST have 0 workshops'

        # 2. Fresh Member Sees No Fabricated Workshops
        r = await mem_c.post('/auth/signup', json={
            'email': f'mem.verify.{tag}@example.com',
            'password': 'SecurePassword123!',
            'name': 'Test Member',
            'role': 'MEMBER'
        })
        assert r.status_code == 201
        mem_token = r.json()['token']
        mem_c.headers['Authorization'] = f'Bearer {mem_token}'

        r = await mem_c.get('/workshops')
        assert r.status_code == 200
        mem_workshops = r.json()
        for w in mem_workshops:
            assert w.get('status') == 'SCHEDULED', 'Member must not see cancelled workshops'

        # 3. Member Forbidden From Requesting Cancelled Workshops
        r = await mem_c.get('/workshops?status=CANCELLED')
        assert r.status_code == 403, f'Expected 403 Forbidden for member requesting cancelled workshops, got {r.status_code}'

        # 4. Organizer Creates Workshop and It Persists
        future_sched = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        r = await org_c.post('/workshops', json={
            'title': f'Reliable Messaging & Outbox {tag}',
            'description': 'Production architecture deep dive',
            'schedule': future_sched,
            'capacity': 25
        })
        assert r.status_code == 201
        created_w = r.json()
        w_id = created_w['id']

        # Organizer lists workshops - must see 1
        r = await org_c.get('/workshops')
        assert len(r.json()) == 1

        # Member lists workshops - must now see this new workshop
        r = await mem_c.get('/workshops')
        found = [w for w in r.json() if w['id'] == w_id]
        assert len(found) == 1, 'Member must see newly created workshop'

        # 5. Cancelled Workshop Disappears from Member List
        r = await org_c.post(f'/workshops/{w_id}/cancel')
        assert r.status_code == 200

        # Member lists workshops again - must NOT see the cancelled workshop
        r = await mem_c.get('/workshops')
        found_cancelled = [w for w in r.json() if w['id'] == w_id]
        assert len(found_cancelled) == 0, 'Cancelled workshop MUST NOT appear in member list'

        # Organizer lists workshops with status=CANCELLED - organizer can see it
        r = await org_c.get('/workshops?status=CANCELLED')
        assert r.status_code == 200
        found_by_org = [w for w in r.json() if w['id'] == w_id]
        assert len(found_by_org) == 1, 'Organizer must be able to view their cancelled workshops'

    backend_app.dependency_overrides.clear()
