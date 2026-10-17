import asyncio
import random
from typing import List, Set


class MockSimulator:
    def __init__(self):
        self.mode: str = "normal"  # normal, fail_500, timeout, delay, flaky
        self.delay_seconds: float = 0.0
        self.failure_rate: float = 0.0
        self.fail_recipients: Set[str] = set()
        self.timeout_recipients: Set[str] = set()

        # Metrics
        self.total_received: int = 0
        self.total_delivered: int = 0
        self.total_failed: int = 0
        self.total_deduplicated: int = 0

    def configure(
        self,
        mode: str = "normal",
        delay_seconds: float = 0.0,
        failure_rate: float = 0.0,
        fail_recipients: List[str] = None,
        timeout_recipients: List[str] = None,
    ):
        self.mode = mode
        self.delay_seconds = max(0.0, delay_seconds)
        self.failure_rate = max(0.0, min(1.0, failure_rate))
        if fail_recipients is not None:
            self.fail_recipients = set(r.strip().lower() for r in fail_recipients)
        if timeout_recipients is not None:
            self.timeout_recipients = set(r.strip().lower() for r in timeout_recipients)

    def reset(self):
        self.mode = "normal"
        self.delay_seconds = 0.0
        self.failure_rate = 0.0
        self.fail_recipients.clear()
        self.timeout_recipients.clear()

    async def evaluate_and_delay(self, recipient_email: str) -> None:
        """
        Applies delay or raises Exception if failure mode is triggered.
        Does NOT record delivery; delivery is only recorded if this succeeds.
        """
        norm_email = recipient_email.strip().lower()

        # Recipient specific timeout
        if norm_email in self.timeout_recipients:
            self.total_failed += 1
            await asyncio.sleep(5.0)  # Exceeds worker 3.0s timeout
            raise TimeoutError(f"Simulated timeout for recipient '{recipient_email}'")

        # Recipient specific failure
        if norm_email in self.fail_recipients:
            self.total_failed += 1
            raise RuntimeError(f"Simulated failure for specific recipient '{recipient_email}'")

        # Global mode evaluations
        if self.mode == "timeout":
            self.total_failed += 1
            await asyncio.sleep(5.0)
            raise TimeoutError("Simulated global timeout failure")

        if self.mode == "fail_500":
            self.total_failed += 1
            raise RuntimeError("Simulated global HTTP 500 server error")

        if self.mode == "delay" and self.delay_seconds > 0:
            await asyncio.sleep(self.delay_seconds)

        if self.mode == "flaky":
            if self.delay_seconds > 0:
                await asyncio.sleep(self.delay_seconds)
            if random.random() < self.failure_rate:
                self.total_failed += 1
                raise RuntimeError(
                    f"Simulated flaky failure (probability {self.failure_rate})"
                )


simulator = MockSimulator()
