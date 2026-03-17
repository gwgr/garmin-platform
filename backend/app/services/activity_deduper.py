from __future__ import annotations

from dataclasses import dataclass
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Activity
from app.observability import log_event
from app.services.garmin import GarminActivitySummary

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ActivityDeduplicationResult:
    fetched_count: int
    existing_source_ids: set[str]
    new_activities: list[GarminActivitySummary]


class ActivityDeduper:
    """Filter fetched Garmin activities down to new source activity IDs."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def find_new_activities(
        self,
        activities: list[GarminActivitySummary],
    ) -> ActivityDeduplicationResult:
        source_ids = [activity.source_activity_id for activity in activities]
        if not source_ids:
            log_event(
                logger,
                logging.INFO,
                "sync.deduplicate_activities.completed",
                fetched_count=0,
                existing_count=0,
                new_count=0,
            )
            return ActivityDeduplicationResult(
                fetched_count=0,
                existing_source_ids=set(),
                new_activities=[],
            )

        existing_source_ids = set(
            self._session.scalars(
                select(Activity.source_activity_id).where(Activity.source_activity_id.in_(source_ids))
            )
        )

        seen_in_batch: set[str] = set()
        new_activities: list[GarminActivitySummary] = []
        for activity in activities:
            source_id = activity.source_activity_id
            if source_id in existing_source_ids or source_id in seen_in_batch:
                continue
            seen_in_batch.add(source_id)
            new_activities.append(activity)

        log_event(
            logger,
            logging.INFO,
            "sync.deduplicate_activities.completed",
            fetched_count=len(activities),
            existing_count=len(existing_source_ids),
            new_count=len(new_activities),
        )
        return ActivityDeduplicationResult(
            fetched_count=len(activities),
            existing_source_ids=existing_source_ids,
            new_activities=new_activities,
        )
