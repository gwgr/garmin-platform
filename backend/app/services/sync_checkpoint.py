from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SyncCheckpoint


@dataclass(frozen=True)
class SyncCheckpointState:
    sync_key: str
    last_synced_at: datetime | None
    last_source_id: str | None


class SyncCheckpointService:
    """Read and update named sync checkpoints in the database."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_checkpoint(self, sync_key: str) -> SyncCheckpointState | None:
        checkpoint = self._session.scalar(
            select(SyncCheckpoint).where(SyncCheckpoint.sync_key == sync_key)
        )
        if checkpoint is None:
            return None
        return SyncCheckpointState(
            sync_key=checkpoint.sync_key,
            last_synced_at=checkpoint.last_synced_at,
            last_source_id=checkpoint.last_source_id,
        )

    def upsert_checkpoint(
        self,
        sync_key: str,
        *,
        last_synced_at: datetime | None,
        last_source_id: str | None = None,
    ) -> SyncCheckpointState:
        checkpoint = self._session.scalar(
            select(SyncCheckpoint).where(SyncCheckpoint.sync_key == sync_key)
        )
        if checkpoint is None:
            checkpoint = SyncCheckpoint(sync_key=sync_key)
            self._session.add(checkpoint)

        checkpoint.last_synced_at = last_synced_at
        checkpoint.last_source_id = last_source_id
        self._session.flush()

        return SyncCheckpointState(
            sync_key=checkpoint.sync_key,
            last_synced_at=checkpoint.last_synced_at,
            last_source_id=checkpoint.last_source_id,
        )
