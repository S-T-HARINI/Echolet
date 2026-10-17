import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from sqlalchemy import select
from backend.app.models.base import utc_now
from backend.app.models.outbox import (
    NotificationEventType,
    NotificationOutbox,
    NotificationStatus,
)
from backend.app.worker.outbox_worker import OutboxWorker, calculate_backoff


@pytest.mark.asyncio
async def test_worker_claim_and_deliver_success(test_session_factory, test_session):
    now = utc_now()
    notif = NotificationOutbox(
        workshop_id="w-1",
        recipient_email="user1@example.com",
        recipient_name="User One",
        event_type=NotificationEventType.WORKSHOP_REGISTRATION_CONFIRMATION,
        payload={"msg": "hello"},
        idempotency_key="key-worker-1",
        status=NotificationStatus.PENDING,
        attempt_count=0,
        next_retry_at=now,
    )
    test_session.add(notif)
    await test_session.commit()

    mock_http_resp = httpx.Response(
        200,
        json={
            "status": "delivered",
            "delivery_id": "mock-deliv-1",
            "idempotency_key": "key-worker-1",
            "idempotent_replay": False,
            "delivered_at": now.isoformat(),
            "message": "Delivered",
        },
        request=httpx.Request("POST", "http://testserver"),
    )

    worker = OutboxWorker(worker_id="test-worker-alpha", session_factory=test_session_factory)

    with patch.object(worker, "get_http_client") as mock_client_getter:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_http_resp
        mock_client_getter.return_value = mock_client

        claimed = await worker.claim_batch(test_session)
        assert len(claimed) == 1
        assert claimed[0].status == NotificationStatus.CLAIMED
        assert claimed[0].claimed_by == "test-worker-alpha"

        success = await worker.deliver_notification(claimed[0])
        assert success is True

        # Verify delivery state in database via fresh session
        async with test_session_factory() as verify_session:
            stmt = select(NotificationOutbox).where(NotificationOutbox.id == notif.id)
            res = await verify_session.execute(stmt)
            updated = res.scalar_one()
            assert updated.status == NotificationStatus.DELIVERED
            assert updated.delivered_at is not None
            assert updated.last_error is None
            assert updated.claimed_by is None


@pytest.mark.asyncio
async def test_worker_retry_on_http_500(test_session_factory, test_session):
    now = utc_now()
    notif = NotificationOutbox(
        workshop_id="w-1",
        recipient_email="user2@example.com",
        recipient_name="User Two",
        event_type=NotificationEventType.WORKSHOP_REGISTRATION_CONFIRMATION,
        payload={"msg": "hello"},
        idempotency_key="key-worker-500",
        status=NotificationStatus.PENDING,
        attempt_count=0,
        next_retry_at=now,
    )
    test_session.add(notif)
    await test_session.commit()

    mock_error_resp = httpx.Response(
        500,
        text="Internal Server Error",
        request=httpx.Request("POST", "http://testserver"),
    )

    worker = OutboxWorker(worker_id="test-worker-beta", session_factory=test_session_factory)

    with patch.object(worker, "get_http_client") as mock_client_getter:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_error_resp
        mock_client_getter.return_value = mock_client

        claimed = await worker.claim_batch(test_session)
        assert len(claimed) == 1

        success = await worker.deliver_notification(claimed[0])
        assert success is False

        # Verify retry state in database via fresh session
        async with test_session_factory() as verify_session:
            stmt = select(NotificationOutbox).where(NotificationOutbox.id == notif.id)
            res = await verify_session.execute(stmt)
            updated = res.scalar_one()
            assert updated.status == NotificationStatus.RETRYING
            assert updated.attempt_count == 1
            assert "HTTP 500" in updated.last_error
            retry_dt = updated.next_retry_at if updated.next_retry_at.tzinfo else updated.next_retry_at.replace(tzinfo=timezone.utc)
            assert retry_dt > now


@pytest.mark.asyncio
async def test_worker_crash_recovery_expired_lease(test_session_factory, test_session):
    expired_time = utc_now() - timedelta(minutes=5)
    notif = NotificationOutbox(
        workshop_id="w-1",
        recipient_email="crash-recovery@example.com",
        recipient_name="Crashed Job",
        event_type=NotificationEventType.WORKSHOP_REGISTRATION_CONFIRMATION,
        payload={},
        idempotency_key="key-crashed",
        status=NotificationStatus.CLAIMED,
        claimed_by="dead-worker",
        claim_expires_at=expired_time,
        attempt_count=1,
        next_retry_at=expired_time,
    )
    test_session.add(notif)
    await test_session.commit()

    # New healthy worker starts
    worker = OutboxWorker(worker_id="recovering-worker", session_factory=test_session_factory)
    claimed = await worker.claim_batch(test_session)

    assert len(claimed) == 1
    assert claimed[0].id == notif.id
    assert claimed[0].claimed_by == "recovering-worker"
    assert claimed[0].claim_expires_at > utc_now()


@pytest.mark.asyncio
async def test_one_failing_recipient_does_not_block_others(test_session_factory, test_session):
    now = utc_now()
    notif_fail = NotificationOutbox(
        workshop_id="w-1",
        recipient_email="fail@example.com",
        recipient_name="Failing User",
        event_type=NotificationEventType.WORKSHOP_REGISTRATION_CONFIRMATION,
        payload={},
        idempotency_key="key-fail-isolation",
        status=NotificationStatus.PENDING,
        attempt_count=0,
        next_retry_at=now,
    )
    notif_success = NotificationOutbox(
        workshop_id="w-1",
        recipient_email="ok@example.com",
        recipient_name="OK User",
        event_type=NotificationEventType.WORKSHOP_REGISTRATION_CONFIRMATION,
        payload={},
        idempotency_key="key-success-isolation",
        status=NotificationStatus.PENDING,
        attempt_count=0,
        next_retry_at=now,
    )
    test_session.add_all([notif_fail, notif_success])
    await test_session.commit()

    worker = OutboxWorker(worker_id="test-worker-iso", session_factory=test_session_factory)

    async def fake_post(url, json=None, **kwargs):
        if json.get("recipient_email") == "fail@example.com":
            return httpx.Response(500, text="Simulated failure", request=httpx.Request("POST", url))
        return httpx.Response(
            200,
            json={"status": "delivered", "delivery_id": "ok-deliv"},
            request=httpx.Request("POST", url),
        )

    with patch.object(worker, "get_http_client") as mock_client_getter:
        mock_client = AsyncMock()
        mock_client.post.side_effect = fake_post
        mock_client_getter.return_value = mock_client

        claimed = await worker.claim_batch(test_session)
        assert len(claimed) == 2

        results = await asyncio.gather(*(worker.deliver_notification(item) for item in claimed))
        assert False in results
        assert True in results

        # In DB via fresh session: fail is RETRYING, ok is DELIVERED
        async with test_session_factory() as verify_session:
            stmt_fail = select(NotificationOutbox).where(NotificationOutbox.id == notif_fail.id)
            res_fail = (await verify_session.execute(stmt_fail)).scalar_one()
            assert res_fail.status == NotificationStatus.RETRYING

            stmt_ok = select(NotificationOutbox).where(NotificationOutbox.id == notif_success.id)
            res_ok = (await verify_session.execute(stmt_ok)).scalar_one()
            assert res_ok.status == NotificationStatus.DELIVERED
