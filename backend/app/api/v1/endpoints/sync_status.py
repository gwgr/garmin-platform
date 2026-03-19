from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.services import SyncStatusResult, SyncStatusService

router = APIRouter()


class SyncStatusResponse(BaseModel):
    sync_key: str
    state: str
    summary: str
    is_stale: bool
    last_attempted_at: datetime | None
    last_succeeded_at: datetime | None
    last_synced_at: datetime | None
    last_source_id: str | None
    last_run_status: str | None
    consecutive_failures: int
    last_error_summary: str | None


@router.get("/sync/status", response_model=SyncStatusResponse, tags=["sync"])
def get_sync_status(session: Session = Depends(get_db_session)) -> SyncStatusResponse:
    result: SyncStatusResult = SyncStatusService(session).get_sync_status()
    return SyncStatusResponse(**result.__dict__)
