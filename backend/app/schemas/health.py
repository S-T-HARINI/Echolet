from datetime import datetime
from typing import Dict, Any
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str
    database: str
    pending_notifications: int
    worker_health: str
    timestamp: datetime
