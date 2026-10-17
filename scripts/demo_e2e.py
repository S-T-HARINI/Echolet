"""
EchoLet Live Demonstration Script
Exercises end-to-end registration, outbox persistence, failure injection,
exponential backoff retry, recovery, and cancellation fan-out.
"""

import asyncio
from datetime import datetime, timedelta, timezone
import httpx

API_BASE = "http://localhost:8000/api/v1"
MOCK_BASE = "http://localhost:8001/api/v1"


async def main():
    print("\n" + "=" * 70)
    print("ECHOLET LIVE END-TO-END DEMONSTRATION & RELIABILITY VERIFICATION")
    print("=" * 70)

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Health Checks
        print("\n[Step 1] Checking system health...")
        health_res = await client.get(f"{API_BASE}/health")
        print(f"Backend Health: {health_res.status_code} - {health_res.json()['status']}")
        mock_health = await client.get(f"{MOCK_BASE}/health")
        print(f"Mock Service Health: {mock_health.status_code} - {mock_health.json()['status']}")

        # Ensure mock service starts in normal mode
        await client.post(f"{MOCK_BASE}/simulate/reset")

        # 2. Create Workshop
        print("\n[Step 2] Creating a new workshop with capacity = 2...")
        future_date = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
        w_res = await client.post(
            f"{API_BASE}/workshops",
            json={
                "title": "High-Throughput Outbox Architecture",
                "description": "Deep-dive into transactional messaging and receiver deduplication.",
                "schedule": future_date,
                "capacity": 2,
            },
        )
        assert w_res.status_code == 201, f"Failed: {w_res.text}"
        workshop = w_res.json()
        workshop_id = workshop["id"]
        print(f"  Created Workshop ID: {workshop_id}")
        print(f"  Title: {workshop['title']}")
        print(f"  Capacity: {workshop['capacity']}, Registered: {workshop['registered_count']}")

        # 3. Register Member 1 (Immediate Outbox PENDING response)
        print("\n[Step 3] Registering Member 1 (Alice)...")
        reg1_res = await client.post(
            f"{API_BASE}/workshops/{workshop_id}/registrations",
            json={
                "member_id": "alice-101",
                "member_name": "Alice Smith",
                "member_email": "alice.smith@example.com",
            },
        )
        assert reg1_res.status_code == 201
        reg1 = reg1_res.json()
        print(f"  Registration Status: {reg1['status']}")
        print(f"  Notification ID: {reg1['notification_id']}")
        print(f"  Initial Notification Status: {reg1['notification_status']} (Returned immediately!)")

        # Wait briefly for worker to deliver
        print("  Waiting 2 seconds for worker to process outbox...")
        await asyncio.sleep(2.0)

        notif1_res = await client.get(f"{API_BASE}/notifications/{reg1['notification_id']}")
        notif1 = notif1_res.json()
        print(f"  Live Notification Status: {notif1['status']} (Delivered at: {notif1['delivered_at']})")
        assert notif1["status"] == "DELIVERED"

        # 4. Register Member 2 (Bob)
        print("\n[Step 4] Registering Member 2 (Bob) - Fills capacity...")
        reg2_res = await client.post(
            f"{API_BASE}/workshops/{workshop_id}/registrations",
            json={
                "member_id": "bob-102",
                "member_name": "Bob Jones",
                "member_email": "bob.jones@example.com",
            },
        )
        assert reg2_res.status_code == 201
        print(f"  Registration Status: {reg2_res.json()['status']}")

        # 5. Capacity Enforcement Check (Member 3 should fail)
        print("\n[Step 5] Attempting to register Member 3 (Charlie) beyond capacity...")
        reg3_res = await client.post(
            f"{API_BASE}/workshops/{workshop_id}/registrations",
            json={
                "member_id": "charlie-103",
                "member_name": "Charlie Brown",
                "member_email": "charlie@example.com",
            },
        )
        print(f"  HTTP Status Code: {reg3_res.status_code} (Expected 409 Conflict)")
        print(f"  Error Detail: {reg3_res.json()['detail']}")
        assert reg3_res.status_code == 409

        # 6. Duplicate Registration Check
        print("\n[Step 6] Attempting duplicate registration for Member 1 (Alice)...")
        dup_res = await client.post(
            f"{API_BASE}/workshops/{workshop_id}/registrations",
            json={
                "member_id": "alice-101",
                "member_name": "Alice Duplicate",
                "member_email": "alice.smith@example.com",
            },
        )
        print(f"  HTTP Status Code: {dup_res.status_code} (Expected 409 Conflict)")
        print(f"  Error Detail: {dup_res.json()['detail']}")
        assert dup_res.status_code == 409

        # 7. Failure Simulation & Recovery
        print("\n[Step 7] Simulating Mock Notification Service HTTP 500 Outage...")
        await client.post(f"{MOCK_BASE}/simulate/configure", json={"mode": "fail_500"})
        print("  Mock service configured to return HTTP 500.")

        # Create new workshop for failure test
        w_fail = (await client.post(
            f"{API_BASE}/workshops",
            json={"title": "Fault Tolerance Workshop", "schedule": future_date, "capacity": 10},
        )).json()

        print("  Registering user during mock service outage...")
        reg_fail_res = await client.post(
            f"{API_BASE}/workshops/{w_fail['id']}/registrations",
            json={"member_id": "dan-104", "member_name": "Dan Miller", "member_email": "dan@example.com"},
        )
        reg_fail = reg_fail_res.json()
        fail_notif_id = reg_fail["notification_id"]

        print("  Waiting 2 seconds for worker attempt and exponential backoff scheduling...")
        await asyncio.sleep(2.0)

        notif_fail_res = await client.get(f"{API_BASE}/notifications/{fail_notif_id}")
        notif_fail = notif_fail_res.json()
        print(f"  Outbox Status: {notif_fail['status']}")
        print(f"  Attempt Count: {notif_fail['attempt_count']}")
        print(f"  Last Error: {notif_fail['last_error']}")
        print(f"  Next Retry Scheduled: {notif_fail['next_retry_at']}")
        assert notif_fail["status"] == "RETRYING"

        # Recover Mock Service
        print("\n[Step 8] Recovering Mock Notification Service to normal...")
        await client.post(f"{MOCK_BASE}/simulate/reset")
        print("  Mock service restored to Normal operation.")
        print("  Waiting 4 seconds for worker retry cycle...")
        await asyncio.sleep(4.0)

        recovered_notif = (await client.get(f"{API_BASE}/notifications/{fail_notif_id}")).json()
        print(f"  Post-Recovery Outbox Status: {recovered_notif['status']}")
        print(f"  Delivered At: {recovered_notif['delivered_at']}")
        assert recovered_notif["status"] == "DELIVERED"

        # 8. Workshop Cancellation Fan-Out
        print("\n[Step 9] Cancelling workshop with 2 registered members...")
        cancel_res = await client.post(f"{API_BASE}/workshops/{workshop_id}/cancel")
        cancel_data = cancel_res.json()
        print(f"  Workshop Status: {cancel_data['status']}")
        print(f"  Cancellation Notifications Queued: {cancel_data['notifications_queued']}")
        assert cancel_data["notifications_queued"] == 2

        # Verify idempotency of cancellation
        print("\n[Step 10] Testing cancellation idempotency (calling cancel a second time)...")
        cancel_repeat_res = await client.post(f"{API_BASE}/workshops/{workshop_id}/cancel")
        print(f"  Repeated cancellation notifications queued: {cancel_repeat_res.json()['notifications_queued']} (Expected 0)")
        assert cancel_repeat_res.json()["notifications_queued"] == 0

        # Verify new registration rejected on cancelled workshop
        print("\n[Step 11] Verifying registrations rejected on cancelled workshop...")
        post_cancel_reg = await client.post(
            f"{API_BASE}/workshops/{workshop_id}/registrations",
            json={"member_id": "late-1", "member_name": "Late Member", "member_email": "late@example.com"},
        )
        print(f"  Status Code: {post_cancel_reg.status_code} (Expected 400)")
        print(f"  Detail: {post_cancel_reg.json()['detail']}")
        assert post_cancel_reg.status_code == 400

    print("\n" + "=" * 70)
    print("ALL LIVE VERIFICATION CRITERIA SUCCESSFULLY DEMONSTRATED AND PASSED!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
