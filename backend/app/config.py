from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "EchoLet API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database settings - defaults to local postgres or fallback
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./echolet.db",
        description="Async SQLAlchemy database URL (e.g., postgresql+psycopg://... or sqlite+aiosqlite:///...)"
    )
    SYNC_DATABASE_URL: str = Field(
        default="sqlite:///./echolet.db",
        description="Synchronous database URL for Alembic migrations"
    )

    # Mock Notification Service
    MOCK_NOTIFICATION_URL: str = Field(
        default="http://localhost:8001/api/v1/notify",
        description="Endpoint of the separate mock notification service"
    )
    MOCK_NOTIFICATION_SERVICE_BASE: str = Field(
        default="http://localhost:8001",
        description="Base URL for mock notification service inspection/controls"
    )

    # Worker Settings
    WORKER_ID: str = "echolet-worker-1"
    WORKER_POLL_INTERVAL: float = 1.0
    WORKER_BATCH_SIZE: int = 20
    WORKER_LEASE_SECONDS: int = 30
    WORKER_BASE_RETRY_DELAY: float = 2.0
    WORKER_MAX_RETRY_DELAY: float = 300.0
    WORKER_HTTP_TIMEOUT: float = 3.0

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]


settings = Settings()
