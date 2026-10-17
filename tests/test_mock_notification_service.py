import pytest


@pytest.mark.asyncio
async def test_mock_service_successful_delivery_and_idempotency(mock_client):
    payload = {
        "idempotency_key": "test-key-100",
        "recipient_email": "success@example.com",
        "recipient_name": "Success User",
        "event_type": "WORKSHOP_REGISTRATION_CONFIRMATION",
        "payload": {"workshop_title": "Test Title"},
    }

    # First delivery attempt
    res1 = await mock_client.post("/api/v1/notify", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "delivered"
    assert data1["idempotent_replay"] is False
    delivery_id = data1["delivery_id"]

    # Replay with same idempotency key (e.g. worker timed out waiting for response)
    res2 = await mock_client.post("/api/v1/notify", json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "delivered"
    assert data2["idempotent_replay"] is True
    assert data2["delivery_id"] == delivery_id

    # Verify only 1 delivery record in deliveries endpoint
    list_res = await mock_client.get("/api/v1/deliveries?idempotency_key=test-key-100")
    assert list_res.status_code == 200
    deliveries = list_res.json()
    assert deliveries["total"] == 1
    assert deliveries["items"][0]["attempt_seen_count"] == 2


@pytest.mark.asyncio
async def test_mock_service_simulated_500_failure_does_not_record_delivery(mock_client):
    # Configure 500 failure
    cfg_res = await mock_client.post(
        "/api/v1/simulate/configure",
        json={"mode": "fail_500"},
    )
    assert cfg_res.status_code == 200

    payload = {
        "idempotency_key": "fail-key-500",
        "recipient_email": "fail@example.com",
        "recipient_name": "Fail User",
        "event_type": "WORKSHOP_REGISTRATION_CONFIRMATION",
    }
    res = await mock_client.post("/api/v1/notify", json=payload)
    assert res.status_code == 500

    # Ensure failed attempt was NOT recorded as a confirmed delivery
    deliv_res = await mock_client.get("/api/v1/deliveries?idempotency_key=fail-key-500")
    assert deliv_res.json()["total"] == 0

    # Reset simulator
    reset_res = await mock_client.post("/api/v1/simulate/reset")
    assert reset_res.status_code == 200

    # Delivery now succeeds
    success_res = await mock_client.post("/api/v1/notify", json=payload)
    assert success_res.status_code == 200
    assert success_res.json()["status"] == "delivered"


@pytest.mark.asyncio
async def test_mock_service_targeted_recipient_failure(mock_client):
    # Target only one recipient to fail
    await mock_client.post(
        "/api/v1/simulate/configure",
        json={
            "mode": "normal",
            "fail_recipients": ["unlucky@example.com"],
        },
    )

    unlucky_payload = {
        "idempotency_key": "unlucky-key",
        "recipient_email": "unlucky@example.com",
        "recipient_name": "Unlucky User",
        "event_type": "WORKSHOP_REGISTRATION_CONFIRMATION",
    }
    lucky_payload = {
        "idempotency_key": "lucky-key",
        "recipient_email": "lucky@example.com",
        "recipient_name": "Lucky User",
        "event_type": "WORKSHOP_REGISTRATION_CONFIRMATION",
    }

    # Unlucky fails
    res_unlucky = await mock_client.post("/api/v1/notify", json=unlucky_payload)
    assert res_unlucky.status_code == 500

    # Lucky succeeds
    res_lucky = await mock_client.post("/api/v1/notify", json=lucky_payload)
    assert res_lucky.status_code == 200
    assert res_lucky.json()["status"] == "delivered"
