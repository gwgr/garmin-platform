from __future__ import annotations

from dataclasses import dataclass
import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models import Activity
from app.observability import log_event
from app.parsers import CorruptFitFileError, FitParserService
from app.services.activity_lap_ingest import ActivityLapIngestService
from app.services.activity_record_ingest import ActivityRecordIngestService
from app.services.activity_summary_ingest import ActivitySummaryIngestService
from app.services.garmin import GarminActivitySummary

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ActivityReprocessBatchResult:
    selected_count: int
    reprocessed_count: int
    skipped_count: int
    failed_count: int


class ActivityReprocessService:
    """Rebuild normalized activity data from stored raw FIT files."""

    def __init__(
        self,
        *,
        session_factory: sessionmaker[Session],
        fit_parser: FitParserService | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._fit_parser = fit_parser or FitParserService()

    def reprocess_activities(
        self,
        *,
        source_activity_id: str | None = None,
        limit: int | None = None,
    ) -> ActivityReprocessBatchResult:
        session = self._session_factory()
        selected_count = 0
        reprocessed_count = 0
        skipped_count = 0
        failed_count = 0

        try:
            query = (
                select(Activity)
                .where(Activity.raw_file_path.is_not(None))
                .order_by(Activity.start_time.asc(), Activity.id.asc())
            )
            if source_activity_id:
                query = query.where(Activity.source_activity_id == source_activity_id)
            if limit is not None:
                query = query.limit(limit)

            activities = session.scalars(query).all()
            selected_count = len(activities)
            log_event(
                logger,
                logging.INFO,
                "reprocess.batch.started",
                selected_count=selected_count,
                source_activity_id=source_activity_id,
                limit=limit,
            )

            summary_ingest = ActivitySummaryIngestService(session, self._fit_parser)
            lap_ingest = ActivityLapIngestService(session, self._fit_parser)
            record_ingest = ActivityRecordIngestService(session, self._fit_parser)

            for activity in activities:
                fit_path = Path(activity.raw_file_path or "")
                if not fit_path.exists():
                    skipped_count += 1
                    log_event(
                        logger,
                        logging.WARNING,
                        "reprocess.activity_skipped",
                        source_activity_id=activity.source_activity_id,
                        raw_file_path=str(fit_path),
                        reason="missing_raw_file",
                    )
                    continue

                try:
                    upstream_activity = GarminActivitySummary(
                        source_activity_id=activity.source_activity_id,
                        name=activity.name,
                        sport=activity.sport,
                        start_time=activity.start_time,
                        duration_seconds=activity.duration_seconds,
                        distance_meters=activity.distance_meters,
                        calories=activity.calories,
                    )
                    persisted_activity = summary_ingest.ingest_activity_summary(
                        activity=upstream_activity,
                        fit_path=fit_path,
                    )
                    lap_ingest.ingest_activity_laps(activity=persisted_activity, fit_path=fit_path)
                    record_ingest.ingest_activity_records(activity=persisted_activity, fit_path=fit_path)
                    session.commit()
                    reprocessed_count += 1
                    log_event(
                        logger,
                        logging.INFO,
                        "reprocess.activity_completed",
                        source_activity_id=activity.source_activity_id,
                        raw_file_path=str(fit_path),
                    )
                except CorruptFitFileError:
                    session.rollback()
                    failed_count += 1
                    log_event(
                        logger,
                        logging.ERROR,
                        "reprocess.activity_failed",
                        source_activity_id=activity.source_activity_id,
                        raw_file_path=str(fit_path),
                        error_type="CorruptFitFileError",
                    )
                except Exception as exc:
                    session.rollback()
                    failed_count += 1
                    log_event(
                        logger,
                        logging.ERROR,
                        "reprocess.activity_failed",
                        source_activity_id=activity.source_activity_id,
                        raw_file_path=str(fit_path),
                        error_type=type(exc).__name__,
                    )

            log_event(
                logger,
                logging.INFO,
                "reprocess.batch.completed",
                selected_count=selected_count,
                reprocessed_count=reprocessed_count,
                skipped_count=skipped_count,
                failed_count=failed_count,
            )
            return ActivityReprocessBatchResult(
                selected_count=selected_count,
                reprocessed_count=reprocessed_count,
                skipped_count=skipped_count,
                failed_count=failed_count,
            )
        finally:
            session.close()
