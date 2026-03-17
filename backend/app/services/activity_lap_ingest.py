from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import Activity, ActivityLap
from app.observability import log_event
from app.parsers import FitParserService, ParsedActivityLap

logger = logging.getLogger(__name__)


class ActivityLapIngestService:
    """Parse FIT lap data and persist it for a stored activity."""

    def __init__(
        self,
        session: Session,
        fit_parser: FitParserService,
    ) -> None:
        self._session = session
        self._fit_parser = fit_parser

    def ingest_activity_laps(
        self,
        *,
        activity: Activity,
        fit_path: str | Path,
    ) -> list[ActivityLap]:
        parsed_laps = self._fit_parser.parse_activity_laps(fit_path)
        self._session.execute(delete(ActivityLap).where(ActivityLap.activity_id == activity.id))

        persisted_laps: list[ActivityLap] = []
        for parsed_lap in parsed_laps:
            lap = ActivityLap(
                activity_id=activity.id,
                lap_index=parsed_lap.lap_index,
                start_time=parsed_lap.start_time,
                duration_seconds=parsed_lap.duration_seconds,
                distance_meters=parsed_lap.distance_meters,
                average_heart_rate=parsed_lap.average_heart_rate,
                max_heart_rate=parsed_lap.max_heart_rate,
                calories=parsed_lap.calories,
            )
            self._session.add(lap)
            persisted_laps.append(lap)

        self._session.flush()
        log_event(
            logger,
            logging.INFO,
            "sync.ingest_activity_laps.completed",
            activity_id=activity.id,
            source_activity_id=activity.source_activity_id,
            fit_path=str(fit_path),
            lap_count=len(persisted_laps),
        )
        return persisted_laps
