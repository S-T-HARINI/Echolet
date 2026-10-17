from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.config import settings
from backend.app.database import get_db_session
from backend.app.models.outbox import NotificationOutbox, NotificationStatus
from backend.app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="System Health Check")
async def health_check(db: AsyncSession = Depends(get_db_session)) -> HealthResponse:
    # Check DB
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)}"

    # Check pending notifications count
    pending_count = 0
    try:
        stmt = select(func.count(NotificationOutbox.id)).where(
            NotificationOutbox.status.in_([NotificationStatus.PENDING, NotificationStatus.RETRYING])
        )
        res = await db.execute(stmt)
        pending_count = res.scalar() or 0
    except Exception:
        pending_count = -1

    # Check mock notification service connectivity
    mock_service_status = "unknown"
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get(f"{settings.MOCK_NOTIFICATION_SERVICE_BASE}/api/v1/health")
            if resp.status_code == 200:
                mock_service_status = "reachable"
            else:
                mock_service_status = f"unexpected_status_{resp.status_code}"
    except Exception:
        mock_service_status = "unreachable"

    overall_status = "healthy" if db_status == "healthy" else "degraded"

    return HealthResponse(
        status=overall_status,
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        database=db_status,
        pending_notifications=pending_count,
        worker_health=mock_service_status,
        timestamp=datetime.now(timezone.utc),
    )
