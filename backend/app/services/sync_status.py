from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.services.garmin_activity_fetcher import GARMIN_ACTIVITY_SYNC_KEY
from app.services.sync_checkpoint import SyncCheckpointService


STALE_SYNC_THRESHOLD = timedelta(hours=12)


@dataclass(frozen=True)
class SyncStatusResult:
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


class SyncStatusService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_sync_status(
        self,
        *,
        sync_key: str = GARMIN_ACTIVITY_SYNC_KEY,
        now: datetime | None = None,
    ) -> SyncStatusResult:
        now = now or datetime.now(timezone.utc)
        checkpoint = SyncCheckpointService(self._session).get_checkpoint(sync_key)

        if checkpoint is None:
            return SyncStatusResult(
                sync_key=sync_key,
                state="warning",
                summary="No sync has completed yet.",
                is_stale=True,
                last_attempted_at=None,
                last_succeeded_at=None,
                last_synced_at=None,
                last_source_id=None,
                last_run_status=None,
                consecutive_failures=0,
                last_error_summary=None,
            )

        last_succeeded_at = checkpoint.last_succeeded_at
        normalized_success_at = (
            last_succeeded_at.replace(tzinfo=timezone.utc) if last_succeeded_at else None
        )
        is_stale = normalized_success_at is None or (now - normalized_success_at) > STALE_SYNC_THRESHOLD

        if checkpoint.last_run_status == "error" and checkpoint.consecutive_failures > 0:
            state = "error"
            summary = checkpoint.last_error_summary or "The latest sync attempt failed."
        elif is_stale:
            state = "warning"
            summary = "Sync is stale or has not completed successfully in the expected window."
        else:
            state = "healthy"
            summary = "Recent sync activity looks healthy."

        return SyncStatusResult(
            sync_key=sync_key,
            state=state,
            summary=summary,
            is_stale=is_stale,
            last_attempted_at=checkpoint.last_attempted_at,
            last_succeeded_at=checkpoint.last_succeeded_at,
            last_synced_at=checkpoint.last_synced_at,
            last_source_id=checkpoint.last_source_id,
            last_run_status=checkpoint.last_run_status,
            consecutive_failures=checkpoint.consecutive_failures,
            last_error_summary=checkpoint.last_error_summary,
        )
