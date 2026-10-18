import pytest
import httpx
from datetime import datetime, timezone, timedelta
import random

BASE = 'http://localhost:8000/api/v1'

def test_workshop_creation_and_member_visibility():
    tag = random.randint(10000, 99999)

    # 1. Fresh Organizer Account Has Exactly 0 Workshops
    org_c = httpx.Client()
    r = org_c.post(f'{BASE}/auth/signup', json={
        'email': f'org.verify.{tag}@example.com',
        'password': 'SecurePassword123!',
        'name': 'Test Organizer',
        'role': 'ORGANIZER'
    })
    assert r.status_code == 201, f'Org signup failed: {r.text}'
    r = org_c.get(f'{BASE}/workshops')
    assert r.status_code == 200
    org_workshops = r.json()
    assert len(org_workshops) == 0, 'Fresh organizer MUST have 0 workshops'

    # 2. Fresh Member Sees No Fabricated Workshops
    mem_c = httpx.Client()
    r = mem_c.post(f'{BASE}/auth/signup', json={
        'email': f'mem.verify.{tag}@example.com',
        'password': 'SecurePassword123!',
        'name': 'Test Member',
        'role': 'MEMBER'
    })
    assert r.status_code == 201
    r = mem_c.get(f'{BASE}/workshops')
    assert r.status_code == 200
    mem_workshops = r.json()
    for w in mem_workshops:
        assert w.get('status') == 'SCHEDULED', 'Member must not see cancelled workshops'

    # 3. Member Forbidden From Requesting Cancelled Workshops
    r = mem_c.get(f'{BASE}/workshops?status=CANCELLED')
    assert r.status_code == 403, f'Expected 403 Forbidden for member requesting cancelled workshops, got {r.status_code}'

    # 4. Organizer Creates Workshop and It Persists
    future_sched = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    r = org_c.post(f'{BASE}/workshops', json={
        'title': f'Reliable Messaging & Outbox {tag}',
        'description': 'Production architecture deep dive',
        'schedule': future_sched,
        'capacity': 25
    })
    assert r.status_code == 201
    created_w = r.json()
    w_id = created_w['id']

    # Organizer lists workshops - must see 1
    r = org_c.get(f'{BASE}/workshops')
    assert len(r.json()) == 1

    # Member lists workshops - must now see this new workshop
    r = mem_c.get(f'{BASE}/workshops')
    found = [w for w in r.json() if w['id'] == w_id]
    assert len(found) == 1, 'Member must see newly created workshop'

    # 5. Cancelled Workshop Disappears from Member List
    r = org_c.post(f'{BASE}/workshops/{w_id}/cancel')
    assert r.status_code == 200

    # Member lists workshops again - must NOT see the cancelled workshop
    r = mem_c.get(f'{BASE}/workshops')
    found_cancelled = [w for w in r.json() if w['id'] == w_id]
    assert len(found_cancelled) == 0, 'Cancelled workshop MUST NOT appear in member list'

    # Organizer lists workshops with status=CANCELLED - organizer can see it
    r = org_c.get(f'{BASE}/workshops?status=CANCELLED')
    assert r.status_code == 200
    found_by_org = [w for w in r.json() if w['id'] == w_id]
    assert len(found_by_org) == 1, 'Organizer must be able to view their cancelled workshops'
