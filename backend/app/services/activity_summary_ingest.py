from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Activity
from app.observability import log_event
from app.parsers import FitParserService, ParsedActivitySummary
from app.services.garmin import GarminActivitySummary

logger = logging.getLogger(__name__)


class ActivitySummaryIngestService:
    """Parse FIT summaries and persist them to the activities table."""

    def __init__(
        self,
        session: Session,
        fit_parser: FitParserService,
    ) -> None:
        self._session = session
        self._fit_parser = fit_parser

    def ingest_activity_summary(
        self,
        *,
        activity: GarminActivitySummary,
        fit_path: str | Path,
    ) -> Activity:
        parsed: ParsedActivitySummary = self._fit_parser.parse_activity_summary(fit_path)
        existing = self._session.scalar(
            select(Activity).where(Activity.source_activity_id == activity.source_activity_id)
        )

        record = existing or Activity(
            source_activity_id=activity.source_activity_id,
            sport=parsed.sport,
            start_time=parsed.start_time,
        )

        record.name = activity.name or parsed.name
        record.sport = activity.sport or parsed.sport
        record.start_time = parsed.start_time
        record.duration_seconds = parsed.duration_seconds or activity.duration_seconds
        record.distance_meters = parsed.distance_meters or activity.distance_meters
        record.calories = parsed.calories or activity.calories
        record.raw_file_path = str(fit_path)

        if existing is None:
            self._session.add(record)

        self._session.flush()
        log_event(
            logger,
            logging.INFO,
            "sync.ingest_activity_summary.completed",
            source_activity_id=activity.source_activity_id,
            activity_id=record.id,
            fit_path=str(fit_path),
            created_activity=existing is None,
        )
        return record
