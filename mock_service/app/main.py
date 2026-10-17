import logging
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from mock_service.app.config import mock_settings
from mock_service.app.database import (
    MockDelivery,
    MockSessionLocal,
    init_mock_db,
    utc_now,
)
from mock_service.app.schemas import (
    NotificationDeliveryResponse,
    NotificationRequest,
    SimulatorConfig,
    SimulatorStatus,
)
from mock_service.app.simulator import simulator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] mock_service: %(message)s",
)
logger = logging.getLogger("mock_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Mock Notification Service storage...")
    await init_mock_db()
    yield
    logger.info("Shutting down Mock Notification Service...")


app = FastAPI(
    title=mock_settings.APP_NAME,
    version=mock_settings.APP_VERSION,
    description="Standalone Mock HTTP Notification Service with durable delivery tracking and configurable failure simulation.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post(
    "/api/v1/notify",
    response_model=NotificationDeliveryResponse,
    status_code=status.HTTP_200_OK,
    summary="Accept and deliver notification",
    description="Accepts a notification request, evaluates simulated failure rules, deduplicates by idempotency key, and persists durable delivery record.",
)
async def deliver_notification(payload: NotificationRequest) -> NotificationDeliveryResponse:
    simulator.total_received += 1
    logger.info(
        "Received notification request for recipient=%s, event=%s, idempotency_key=%s",
        payload.recipient_email,
        payload.event_type,
        payload.idempotency_key,
    )

    # 1. First, check receiver-side idempotency storage
    async with MockSessionLocal() as session:
        stmt = select(MockDelivery).where(MockDelivery.idempotency_key == payload.idempotency_key)
        result = await session.execute(stmt)
        existing_delivery = result.scalar_one_or_none()

        if existing_delivery:
            existing_delivery.attempt_seen_count += 1
            await session.commit()
            simulator.total_deduplicated += 1
            logger.info(
                "Idempotency hit! Notification '%s' already recorded as delivered. Returning confirmed response.",
                payload.idempotency_key,
            )
            return NotificationDeliveryResponse(
                status="delivered",
                delivery_id=existing_delivery.id,
                idempotency_key=existing_delivery.idempotency_key,
                idempotent_replay=True,
                delivered_at=existing_delivery.delivered_at,
                message="Notification already delivered previously (idempotent deduplication).",
            )

    # 2. Evaluate simulated failures/delays BEFORE persisting delivery
    try:
        await simulator.evaluate_and_delay(payload.recipient_email)
    except TimeoutError as exc:
        logger.warning("Simulated timeout occurred for %s: %s", payload.recipient_email, exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Notification gateway timed out: {str(exc)}",
        )
    except Exception as exc:
        logger.warning("Simulated failure occurred for %s: %s", payload.recipient_email, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mock notification delivery failed: {str(exc)}",
        )

    # 3. If no failure occurred, persist delivery record in durable storage
    now = utc_now()
    async with MockSessionLocal() as session:
        delivery = MockDelivery(
            idempotency_key=payload.idempotency_key,
            recipient_email=payload.recipient_email,
            recipient_name=payload.recipient_name,
            event_type=payload.event_type,
            payload=payload.payload,
            attempt_seen_count=1,
            delivered_at=now,
        )
        session.add(delivery)
        await session.commit()
        await session.refresh(delivery)

    simulator.total_delivered += 1
    logger.info("Successfully delivered and recorded notification id=%s", delivery.id)

    return NotificationDeliveryResponse(
        status="delivered",
        delivery_id=delivery.id,
        idempotency_key=delivery.idempotency_key,
        idempotent_replay=False,
        delivered_at=delivery.delivered_at,
        message="Notification delivered and recorded successfully.",
    )


@app.get("/api/v1/deliveries", summary="Query recorded deliveries")
async def list_deliveries(
    recipient_email: Optional[str] = Query(None),
    idempotency_key: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    async with MockSessionLocal() as session:
        query = select(MockDelivery)
        if recipient_email:
            query = query.where(MockDelivery.recipient_email == recipient_email)
        if idempotency_key:
            query = query.where(MockDelivery.idempotency_key == idempotency_key)

        query = query.order_by(MockDelivery.delivered_at.desc()).limit(limit).offset(offset)
        res = await session.execute(query)
        deliveries = res.scalars().all()

        count_stmt = select(func.count(MockDelivery.id))
        total = (await session.execute(count_stmt)).scalar() or 0

        return {
            "total": total,
            "items": [
                {
                    "id": d.id,
                    "idempotency_key": d.idempotency_key,
                    "recipient_email": d.recipient_email,
                    "recipient_name": d.recipient_name,
                    "event_type": d.event_type,
                    "payload": d.payload,
                    "attempt_seen_count": d.attempt_seen_count,
                    "delivered_at": d.delivered_at,
                }
                for d in deliveries
            ],
        }


@app.post("/api/v1/simulate/configure", summary="Configure failure simulation")
async def configure_simulation(config: SimulatorConfig) -> SimulatorStatus:
    simulator.configure(
        mode=config.mode,
        delay_seconds=config.delay_seconds,
        failure_rate=config.failure_rate,
        fail_recipients=config.fail_recipients,
        timeout_recipients=config.timeout_recipients,
    )
    logger.info("Simulator configured: mode=%s, delay=%s, failure_rate=%s", config.mode, config.delay_seconds, config.failure_rate)
    return get_current_simulator_status()


@app.get("/api/v1/simulate/status", summary="Get failure simulation status")
async def get_simulation_status() -> SimulatorStatus:
    return get_current_simulator_status()


@app.post("/api/v1/simulate/reset", summary="Reset failure simulation to normal")
async def reset_simulation() -> SimulatorStatus:
    simulator.reset()
    logger.info("Simulator reset to normal mode.")
    return get_current_simulator_status()


def get_current_simulator_status() -> SimulatorStatus:
    return SimulatorStatus(
        mode=simulator.mode,
        delay_seconds=simulator.delay_seconds,
        failure_rate=simulator.failure_rate,
        fail_recipients=list(simulator.fail_recipients),
        timeout_recipients=list(simulator.timeout_recipients),
        total_received=simulator.total_received,
        total_delivered=simulator.total_delivered,
        total_failed=simulator.total_failed,
        total_deduplicated=simulator.total_deduplicated,
    )


@app.get("/api/v1/health", summary="Mock service health")
async def health():
    return {
        "status": "healthy",
        "service": "EchoLet Mock Notification Service",
        "simulation_mode": simulator.mode,
        "total_delivered": simulator.total_delivered,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mock_service.app.main:app", host=mock_settings.HOST, port=mock_settings.PORT, reload=False)
