from pydantic_settings import BaseSettings, SettingsConfigDict


class MockSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "EchoLet Mock Notification Service"
    APP_VERSION: str = "1.0.0"
    PORT: int = 8001
    HOST: str = "0.0.0.0"

    # Durable persistence for deliveries
    DATABASE_URL: str = "sqlite+aiosqlite:///./mock_notifications.db"


mock_settings = MockSettings()
