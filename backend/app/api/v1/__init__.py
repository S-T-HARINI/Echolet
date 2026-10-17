from fastapi import APIRouter
from backend.app.api.v1.workshops import router as workshops_router
from backend.app.api.v1.registrations import router as registrations_router
from backend.app.api.v1.notifications import router as notifications_router
from backend.app.api.v1.health import router as health_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(workshops_router)
api_v1_router.include_router(registrations_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(health_router)

__all__ = ["api_v1_router"]
