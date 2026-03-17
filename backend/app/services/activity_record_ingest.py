from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import Activity, ActivityRecord
from app.observability import log_event
from app.parsers import FitParserService

logger = logging.getLogger(__name__)


class ActivityRecordIngestService:
    """Parse FIT record streams and persist them for a stored activity."""

    def __init__(
        self,
        session: Session,
        fit_parser: FitParserService,
    ) -> None:
        self._session = session
        self._fit_parser = fit_parser

    def ingest_activity_records(
        self,
        *,
        activity: Activity,
        fit_path: str | Path,
    ) -> list[ActivityRecord]:
        parsed_records = self._fit_parser.parse_activity_records(fit_path)
        self._session.execute(delete(ActivityRecord).where(ActivityRecord.activity_id == activity.id))

        persisted_records: list[ActivityRecord] = []
        for parsed_record in parsed_records:
            record = ActivityRecord(
                activity_id=activity.id,
                record_time=parsed_record.record_time,
                elapsed_seconds=parsed_record.elapsed_seconds,
                distance_meters=parsed_record.distance_meters,
                latitude_degrees=parsed_record.latitude_degrees,
                longitude_degrees=parsed_record.longitude_degrees,
                altitude_meters=parsed_record.altitude_meters,
                heart_rate=parsed_record.heart_rate,
                cadence=parsed_record.cadence,
                speed_mps=parsed_record.speed_mps,
                power_watts=parsed_record.power_watts,
                temperature_celsius=parsed_record.temperature_celsius,
            )
            self._session.add(record)
            persisted_records.append(record)

        self._session.flush()
        log_event(
            logger,
            logging.INFO,
            "sync.ingest_activity_records.completed",
            activity_id=activity.id,
            source_activity_id=activity.source_activity_id,
            fit_path=str(fit_path),
            record_count=len(persisted_records),
        )
        return persisted_records
