from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from sqlalchemy import select
from backend.app.models.base import utc_now
from backend.app.models.outbox import NotificationOutbox, NotificationStatus
from backend.app.worker.outbox_worker import OutboxWorker


@pytest.mark.asyncio
async def test_end_to_end_failure_and_recovery_flow(client, test_session, test_session_factory):
    # 1. Create workshop and register member
    future_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    w_res = await client.post(
        "/api/v1/workshops",
        json={"title": "Recovery Drill Workshop", "schedule": future_date, "capacity": 10},
    )
    workshop_id = w_res.json()["id"]

    reg_res = await client.post(
        f"/api/v1/workshops/{workshop_id}/registrations",
        json={
            "member_id": "recovery-user",
            "member_name": "Bob Recovery",
            "member_email": "bob.recovery@example.com",
        },
    )
    assert reg_res.status_code == 201
    notif_id = reg_res.json()["notification_id"]

    # Notification starts as PENDING
    notif_check_1 = await client.get(f"/api/v1/notifications/{notif_id}")
    assert notif_check_1.status_code == 200
    assert notif_check_1.json()["status"] == NotificationStatus.PENDING

    # 2. First delivery attempt encounters mock service failure (500)
    worker1 = OutboxWorker(worker_id="worker-run-1", session_factory=test_session_factory)

    mock_500_resp = httpx.Response(
        500,
        text="Mock Service Temporary Outage",
        request=httpx.Request("POST", "http://testserver"),
    )

    with patch.object(worker1, "get_http_client") as mock_client_getter:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_500_resp
        mock_client_getter.return_value = mock_client

        claimed = await worker1.claim_batch(test_session)
        assert len(claimed) == 1
        assert claimed[0].id == notif_id
        await worker1.deliver_notification(claimed[0])

    # Inspect status: it must now be RETRYING with attempt_count 1
    notif_check_2 = await client.get(f"/api/v1/notifications/{notif_id}")
    assert notif_check_2.status_code == 200
    assert notif_check_2.json()["status"] == NotificationStatus.RETRYING
    assert notif_check_2.json()["attempt_count"] == 1
    assert "HTTP 500" in notif_check_2.json()["last_error"]

    # 3. Simulate passage of time for retry and mock service recovery
    stmt = select(NotificationOutbox).where(NotificationOutbox.id == notif_id)
    notif_record = (await test_session.execute(stmt)).scalar_one()
    notif_record.next_retry_at = utc_now() - timedelta(seconds=1)
    await test_session.commit()

    # 4. Worker 2 (or restarted worker) runs after recovery
    worker2 = OutboxWorker(worker_id="worker-run-2", session_factory=test_session_factory)

    mock_200_resp = httpx.Response(
        200,
        json={
            "status": "delivered",
            "delivery_id": "rec-deliv-1",
            "idempotency_key": notif_record.idempotency_key,
            "idempotent_replay": False,
            "delivered_at": utc_now().isoformat(),
            "message": "Delivered successfully after recovery",
        },
        request=httpx.Request("POST", "http://testserver"),
    )

    with patch.object(worker2, "get_http_client") as mock_client_getter:
        mock_client2 = AsyncMock()
        mock_client2.post.return_value = mock_200_resp
        mock_client_getter.return_value = mock_client2

        claimed_retry = await worker2.claim_batch(test_session)
        assert len(claimed_retry) == 1
        assert claimed_retry[0].id == notif_id
        await worker2.deliver_notification(claimed_retry[0])

    # 5. Verify final status is DELIVERED
    notif_check_3 = await client.get(f"/api/v1/notifications/{notif_id}")
    assert notif_check_3.status_code == 200
    final_data = notif_check_3.json()
    assert final_data["status"] == NotificationStatus.DELIVERED
    assert final_data["delivered_at"] is not None
    assert final_data["last_error"] is None
