from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import logging

from app.observability import log_event
from app.services.garmin import GarminActivitySummary, GarminClient
from app.services.sync_checkpoint import SyncCheckpointService, SyncCheckpointState


GARMIN_ACTIVITY_SYNC_KEY = "garmin_activities"
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GarminActivityFetchResult:
    sync_key: str
    since: datetime | None
    start: int
    is_backfill: bool
    checkpoint: SyncCheckpointState | None
    activities: list[GarminActivitySummary]


class GarminActivityFetcher:
    """Fetch Garmin activity summaries using the current sync checkpoint."""

    def __init__(
        self,
        garmin_client: GarminClient,
        checkpoint_service: SyncCheckpointService,
        *,
        limit: int = 100,
    ) -> None:
        self._garmin_client = garmin_client
        self._checkpoint_service = checkpoint_service
        self._limit = limit

    def fetch_activities(self) -> GarminActivityFetchResult:
        checkpoint = self._checkpoint_service.get_checkpoint(GARMIN_ACTIVITY_SYNC_KEY)
        is_backfill = (
            checkpoint is None
            or checkpoint.backfill_offset is not None
            or checkpoint.last_synced_at is None
        )
        start = checkpoint.backfill_offset if checkpoint and checkpoint.backfill_offset is not None else 0
        since = None if is_backfill else checkpoint.last_synced_at
        log_event(
            logger,
            logging.INFO,
            "sync.fetch_activities.started",
            sync_key=GARMIN_ACTIVITY_SYNC_KEY,
            since=since.isoformat() if since else None,
            start=start,
            is_backfill=is_backfill,
            limit=self._limit,
        )
        activities = self._garmin_client.list_activities(
            since=since,
            limit=self._limit,
            start=start,
        )
        ordered_activities = sorted(activities, key=lambda activity: activity.start_time)
        log_event(
            logger,
            logging.INFO,
            "sync.fetch_activities.completed",
            sync_key=GARMIN_ACTIVITY_SYNC_KEY,
            fetched_count=len(ordered_activities),
            since=since.isoformat() if since else None,
            start=start,
            is_backfill=is_backfill,
            checkpoint_found=checkpoint is not None,
            limit=self._limit,
        )

        return GarminActivityFetchResult(
            sync_key=GARMIN_ACTIVITY_SYNC_KEY,
            since=since,
            start=start,
            is_backfill=is_backfill,
            checkpoint=checkpoint,
            activities=ordered_activities,
        )
