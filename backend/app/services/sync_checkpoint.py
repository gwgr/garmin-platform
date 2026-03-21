from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SyncCheckpoint


@dataclass(frozen=True)
class SyncCheckpointState:
    sync_key: str
    last_synced_at: datetime | None
    last_source_id: str | None
    backfill_offset: int | None
    last_attempted_at: datetime | None
    last_succeeded_at: datetime | None
    last_run_status: str | None
    consecutive_failures: int
    last_error_summary: str | None


class SyncCheckpointService:
    """Read and update named sync checkpoints in the database."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def _get_or_create_checkpoint(self, sync_key: str) -> SyncCheckpoint:
        checkpoint = self._session.scalar(
            select(SyncCheckpoint).where(SyncCheckpoint.sync_key == sync_key)
        )
        if checkpoint is None:
            checkpoint = SyncCheckpoint(sync_key=sync_key)
            self._session.add(checkpoint)
            self._session.flush()
        return checkpoint

    def _to_state(self, checkpoint: SyncCheckpoint) -> SyncCheckpointState:
        return SyncCheckpointState(
            sync_key=checkpoint.sync_key,
            last_synced_at=checkpoint.last_synced_at,
            last_source_id=checkpoint.last_source_id,
            backfill_offset=checkpoint.backfill_offset,
            last_attempted_at=checkpoint.last_attempted_at,
            last_succeeded_at=checkpoint.last_succeeded_at,
            last_run_status=checkpoint.last_run_status,
            consecutive_failures=int(checkpoint.consecutive_failures or 0),
            last_error_summary=checkpoint.last_error_summary,
        )

    def get_checkpoint(self, sync_key: str) -> SyncCheckpointState | None:
        checkpoint = self._session.scalar(
            select(SyncCheckpoint).where(SyncCheckpoint.sync_key == sync_key)
        )
        if checkpoint is None:
            return None
        return self._to_state(checkpoint)

    def upsert_checkpoint(
        self,
        sync_key: str,
        *,
        last_synced_at: datetime | None,
        last_source_id: str | None = None,
        backfill_offset: int | None = None,
    ) -> SyncCheckpointState:
        checkpoint = self._get_or_create_checkpoint(sync_key)
        checkpoint.last_synced_at = last_synced_at
        checkpoint.last_source_id = last_source_id
        checkpoint.backfill_offset = backfill_offset
        self._session.flush()
        return self._to_state(checkpoint)

    def mark_sync_started(
        self,
        sync_key: str,
        *,
        attempted_at: datetime | None = None,
    ) -> SyncCheckpointState:
        checkpoint = self._get_or_create_checkpoint(sync_key)
        checkpoint.last_attempted_at = attempted_at or datetime.now(timezone.utc)
        checkpoint.last_run_status = "running"
        self._session.flush()
        return self._to_state(checkpoint)

    def mark_sync_succeeded(
        self,
        sync_key: str,
        *,
        last_synced_at: datetime | None,
        last_source_id: str | None = None,
        backfill_offset: int | None = None,
        completed_at: datetime | None = None,
    ) -> SyncCheckpointState:
        checkpoint = self._get_or_create_checkpoint(sync_key)
        timestamp = completed_at or datetime.now(timezone.utc)
        checkpoint.last_attempted_at = timestamp
        checkpoint.last_succeeded_at = timestamp
        checkpoint.last_run_status = "success"
        checkpoint.consecutive_failures = 0
        checkpoint.last_error_summary = None
        checkpoint.last_synced_at = last_synced_at
        checkpoint.last_source_id = last_source_id
        checkpoint.backfill_offset = backfill_offset
        self._session.flush()
        return self._to_state(checkpoint)

    def mark_sync_failed(
        self,
        sync_key: str,
        *,
        error_summary: str,
        attempted_at: datetime | None = None,
    ) -> SyncCheckpointState:
        checkpoint = self._get_or_create_checkpoint(sync_key)
        checkpoint.last_attempted_at = attempted_at or datetime.now(timezone.utc)
        checkpoint.last_run_status = "error"
        checkpoint.last_error_summary = error_summary[:512]
        checkpoint.consecutive_failures = int(checkpoint.consecutive_failures or 0) + 1
        self._session.flush()
        return self._to_state(checkpoint)
