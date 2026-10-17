import asyncio
import logging
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.config import settings
from backend.app.database import AsyncSessionLocal
from backend.app.models.base import utc_now
from backend.app.models.outbox import (
    NotificationOutbox,
    NotificationStatus,
)

logger = logging.getLogger("echolet.worker")


def calculate_backoff(
    attempt_count: int,
    base_delay: float = 2.0,
    max_delay: float = 300.0,
) -> float:
    """
    Computes exponential backoff with full jitter to avoid thundering herds.
    delay = min(max_delay, base_delay * (2 ** attempt_count)) * uniform(0.5, 1.0)
    """
    exp_delay = min(max_delay, base_delay * (2 ** max(0, attempt_count - 1)))
    jittered_delay = exp_delay * random.uniform(0.5, 1.0)
    return max(1.0, jittered_delay)


class OutboxWorker:
    def __init__(
        self,
        worker_id: Optional[str] = None,
        poll_interval: Optional[float] = None,
        batch_size: Optional[int] = None,
        lease_seconds: Optional[int] = None,
        http_timeout: Optional[float] = None,
        mock_notification_url: Optional[str] = None,
        session_factory: Optional[object] = None,
    ):
        self.worker_id = worker_id or f"worker-{uuid.uuid4().hex[:8]}"
        self.poll_interval = poll_interval or settings.WORKER_POLL_INTERVAL
        self.batch_size = batch_size or settings.WORKER_BATCH_SIZE
        self.lease_seconds = lease_seconds or settings.WORKER_LEASE_SECONDS
        self.http_timeout = http_timeout or settings.WORKER_HTTP_TIMEOUT
        self.mock_notification_url = mock_notification_url or settings.MOCK_NOTIFICATION_URL
        self.session_factory = session_factory or AsyncSessionLocal
        self._running = False
        self._http_client: Optional[httpx.AsyncClient] = None

    async def get_http_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=self.http_timeout)
        return self._http_client

    async def close_http_client(self) -> None:
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
            self._http_client = None

    async def claim_batch(self, session: AsyncSession) -> List[NotificationOutbox]:
        """
        Atomically queries and claims a batch of pending/retrying notifications
        or expired claims (crash recovery) using row leases and FOR UPDATE SKIP LOCKED.
        """
        now = utc_now()
        lease_expiry = now + timedelta(seconds=self.lease_seconds)

        # Select pending or retrying events due for retry, OR expired claims from crashed workers
        query = (
            select(NotificationOutbox)
            .where(
                or_(
                    NotificationOutbox.status.in_([NotificationStatus.PENDING, NotificationStatus.RETRYING])
                    & (NotificationOutbox.next_retry_at <= now),
                    (NotificationOutbox.status == NotificationStatus.CLAIMED)
                    & (NotificationOutbox.claim_expires_at <= now),
                )
            )
            .order_by(NotificationOutbox.next_retry_at.asc())
            .limit(self.batch_size)
        )

        if session.bind and session.bind.dialect.name == "postgresql":
            query = query.with_for_update(skip_locked=True)

        res = await session.execute(query)
        notifications = list(res.scalars().all())

        if not notifications:
            return []

        # Claim each notification row with lease timestamp
        for n in notifications:
            n.status = NotificationStatus.CLAIMED
            n.claimed_by = self.worker_id
            n.claim_expires_at = lease_expiry

        await session.commit()

        logger.info(
            "Worker '%s' claimed %d outbox notifications (lease expires in %ds)",
            self.worker_id,
            len(notifications),
            self.lease_seconds,
        )
        return notifications

    async def deliver_notification(self, notification: NotificationOutbox) -> bool:
        """
        Dispatches a single claimed notification over HTTP to the mock notification service.
        Does NOT keep a database transaction open during external network I/O.
        """
        client = await self.get_http_client()
        request_payload = {
            "idempotency_key": notification.idempotency_key,
            "recipient_email": notification.recipient_email,
            "recipient_name": notification.recipient_name,
            "event_type": notification.event_type,
            "payload": notification.payload,
        }

        try:
            logger.info(
                "Worker '%s' dispatching notification id=%s (attempt %d) to %s",
                self.worker_id,
                notification.id,
                notification.attempt_count + 1,
                notification.recipient_email,
            )
            response = await client.post(
                self.mock_notification_url,
                json=request_payload,
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "delivered":
                    await self._record_success(notification.id)
                    logger.info("Notification id=%s delivered successfully.", notification.id)
                    return True
                else:
                    error_msg = f"Unexpected response body: {data}"
                    await self._record_failure(notification.id, error_msg, notification.attempt_count)
                    return False
            else:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                await self._record_failure(notification.id, error_msg, notification.attempt_count)
                return False

        except httpx.TimeoutException as exc:
            error_msg = f"HTTP request timed out after {self.http_timeout}s: {exc}"
            logger.warning("Delivery timeout for notification %s: %s", notification.id, error_msg)
            await self._record_failure(notification.id, error_msg, notification.attempt_count)
            return False
        except httpx.RequestError as exc:
            error_msg = f"HTTP network/connection error: {str(exc)}"
            logger.warning("Delivery network error for notification %s: %s", notification.id, error_msg)
            await self._record_failure(notification.id, error_msg, notification.attempt_count)
            return False
        except Exception as exc:
            error_msg = f"Unexpected worker error during delivery: {str(exc)}"
            logger.exception("Unexpected error dispatching notification %s: %s", notification.id, exc)
            await self._record_failure(notification.id, error_msg, notification.attempt_count)
            return False

    async def _record_success(self, notification_id: str) -> None:
        async with self.session_factory() as session:
            stmt = select(NotificationOutbox).where(NotificationOutbox.id == notification_id)
            res = await session.execute(stmt)
            notif = res.scalar_one_or_none()
            if notif:
                notif.status = NotificationStatus.DELIVERED
                notif.delivered_at = utc_now()
                notif.last_error = None
                notif.claimed_by = None
                notif.claim_expires_at = None
                await session.commit()

    async def _record_failure(self, notification_id: str, error_message: str, current_attempts: int) -> None:
        now = utc_now()
        new_attempts = current_attempts + 1
        delay_seconds = calculate_backoff(
            attempt_count=new_attempts,
            base_delay=settings.WORKER_BASE_RETRY_DELAY,
            max_delay=settings.WORKER_MAX_RETRY_DELAY,
        )
        next_retry = now + timedelta(seconds=delay_seconds)

        async with self.session_factory() as session:
            stmt = select(NotificationOutbox).where(NotificationOutbox.id == notification_id)
            res = await session.execute(stmt)
            notif = res.scalar_one_or_none()
            if notif:
                notif.status = NotificationStatus.RETRYING
                notif.attempt_count = new_attempts
                notif.last_error = error_message
                notif.next_retry_at = next_retry
                notif.claimed_by = None
                notif.claim_expires_at = None
                await session.commit()
                logger.info(
                    "Scheduled retry for notification %s in %.1fs (attempt %d)",
                    notification_id,
                    delay_seconds,
                    new_attempts,
                )

    async def process_batch_once(self) -> int:
        """
        Executes a single polling and processing cycle.
        Returns the number of notifications processed.
        """
        async with self.session_factory() as session:
            claimed_items = await self.claim_batch(session)

        if not claimed_items:
            return 0

        # Deliver each notification independently so one failing recipient does not block others
        tasks = [self.deliver_notification(item) for item in claimed_items]
        await asyncio.gather(*tasks, return_exceptions=True)
        return len(claimed_items)

    async def run(self) -> None:
        """
        Continuous worker loop for background execution.
        """
        self._running = True
        logger.info("OutboxWorker '%s' started. Polling every %.1fs", self.worker_id, self.poll_interval)

        try:
            while self._running:
                try:
                    processed_count = await self.process_batch_once()
                    if processed_count == 0:
                        await asyncio.sleep(self.poll_interval)
                except asyncio.CancelledError:
                    logger.info("Worker loop cancelled.")
                    break
                except Exception as exc:
                    logger.exception("Error in worker poll loop: %s", exc)
                    await asyncio.sleep(self.poll_interval)
        finally:
            await self.close_http_client()
            logger.info("OutboxWorker '%s' stopped.", self.worker_id)

    def stop(self) -> None:
        self._running = False
