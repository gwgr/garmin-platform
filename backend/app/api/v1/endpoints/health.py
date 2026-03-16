from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.config import Settings

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    environment: str


@router.get("/health", response_model=HealthResponse, tags=["health"])
def get_health(request: Request) -> HealthResponse:
    settings: Settings = request.app.state.settings
    return HealthResponse(
        status="ok",
        environment=settings.app_env,
    )
