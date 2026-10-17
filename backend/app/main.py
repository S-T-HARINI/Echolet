import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.api.v1 import api_v1_router
from backend.app.config import settings
from backend.app.database import init_db
from backend.app.exceptions import EchoLetException

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("echolet.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up EchoLet Backend API...")
    # Initialize DB tables for development/testing if needed
    try:
        await init_db()
        logger.info("Database schema verified/initialized successfully.")
    except Exception as exc:
        logger.error("Failed to initialize database schema: %s", exc)
    yield
    logger.info("Shutting down EchoLet Backend API...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "EchoLet — Production-Quality Workshop Registration & Reliable Notification System. "
        "Engineered with the Transactional Outbox Pattern for guaranteed, fault-tolerant notification delivery."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_v1_router)


@app.exception_handler(EchoLetException)
async def echolet_exception_handler(request: Request, exc: EchoLetException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "error_type": exc.__class__.__name__},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred.", "error_type": "InternalServerError"},
    )


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/api/v1/health",
    }
