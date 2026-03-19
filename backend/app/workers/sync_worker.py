from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings, get_settings
from app.db import get_session_factory
from app.models import Activity
from app.observability import configure_logging, log_event
from app.parsers import CorruptFitFileError, FitParserService
from app.services import (
    GARMIN_ACTIVITY_SYNC_KEY,
    ActivityDeduper,
    ActivityFitDownloader,
    ActivityLapIngestService,
    ActivityRecordIngestService,
    ActivitySummaryIngestService,
    GarminActivityFetcher,
    RawFileStorageService,
    SyncCheckpointService,
    get_garmin_client,
    GarminDownloadError,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SyncWorkerResult:
    fetched_count: int
    new_count: int
    downloaded_count: int
    ingested_count: int
    checkpoint_updated_to: datetime | None


class GarminSyncWorker:
    """Run the Garmin sync pipeline using the shared backend services."""

    def __init__(
        self,
        *,
        session_factory: sessionmaker[Session],
        settings: Settings,
    ) -> None:
        self._session_factory = session_factory
        self._settings = settings
        self._garmin_client = get_garmin_client()
        self._raw_file_storage = RawFileStorageService(settings.raw_data_dir)
        self._fit_parser = FitParserService()

    def _activity_already_exists(self, session: Session, source_activity_id: str) -> bool:
        existing_id = session.scalar(
            select(Activity.id).where(Activity.source_activity_id == source_activity_id)
        )
        return existing_id is not None

    def _advance_checkpoint(
        self,
        checkpoint_service: SyncCheckpointService,
        session: Session,
        *,
        activity,
    ) -> datetime:
        checkpoint = checkpoint_service.upsert_checkpoint(
            GARMIN_ACTIVITY_SYNC_KEY,
            last_synced_at=activity.start_time,
            last_source_id=activity.source_activity_id,
        )
        session.commit()
        return checkpoint.last_synced_at

    def run_once(self) -> SyncWorkerResult:
        fetched_count = 0
        new_count = 0
        downloaded_count = 0
        ingested_count = 0
        checkpoint_updated_to: datetime | None = None

        session = self._session_factory()
        checkpoint_service = SyncCheckpointService(session)

        try:
            fetch_result = GarminActivityFetcher(
                self._garmin_client,
                checkpoint_service,
                limit=self._settings.garmin_sync_limit,
            ).fetch_activities()
            fetched_count = len(fetch_result.activities)

            dedupe_result = ActivityDeduper(session).find_new_activities(fetch_result.activities)
            new_activities = dedupe_result.new_activities
            new_count = len(new_activities)

            log_event(
                logger,
                logging.INFO,
                "worker.sync.started",
                fetched_count=fetched_count,
                new_count=new_count,
                sync_key=fetch_result.sync_key,
                sync_limit=self._settings.garmin_sync_limit,
            )

            downloader = ActivityFitDownloader(
                self._garmin_client,
                self._raw_file_storage,
                self._fit_parser,
            )
            summary_ingest = ActivitySummaryIngestService(session, self._fit_parser)
            lap_ingest = ActivityLapIngestService(session, self._fit_parser)
            record_ingest = ActivityRecordIngestService(session, self._fit_parser)

            for activity in new_activities:
                if self._activity_already_exists(session, activity.source_activity_id):
                    checkpoint_updated_to = self._advance_checkpoint(
                        checkpoint_service,
                        session,
                        activity=activity,
                    )
                    log_event(
                        logger,
                        logging.WARNING,
                        "worker.sync.duplicate_activity_skipped",
                        source_activity_id=activity.source_activity_id,
                        checkpoint_updated_to=checkpoint_updated_to.isoformat(),
                    )
                    continue

                download_result = None
                try:
                    download_result = downloader.download_activity_fit(activity)
                    downloaded_count += 1

                    persisted_activity = summary_ingest.ingest_activity_summary(
                        activity=activity,
                        fit_path=download_result.file_path,
                    )
                    lap_ingest.ingest_activity_laps(
                        activity=persisted_activity,
                        fit_path=download_result.file_path,
                    )
                    record_ingest.ingest_activity_records(
                        activity=persisted_activity,
                        fit_path=download_result.file_path,
                    )

                    checkpoint_updated_to = self._advance_checkpoint(
                        checkpoint_service,
                        session,
                        activity=activity,
                    )
                    ingested_count += 1
                except GarminDownloadError as exc:
                    session.rollback()
                    checkpoint_updated_to = self._advance_checkpoint(
                        checkpoint_service,
                        session,
                        activity=activity,
                    )
                    log_event(
                        logger,
                        logging.ERROR,
                        "worker.sync.activity_skipped",
                        source_activity_id=activity.source_activity_id,
                        error_type=type(exc).__name__,
                        quarantine_path=None,
                        checkpoint_updated_to=checkpoint_updated_to.isoformat(),
                    )
                    continue
                except CorruptFitFileError as exc:
                    session.rollback()
                    quarantine_path = None
                    if download_result is not None:
                        quarantine_path = self._raw_file_storage.copy_to_quarantine(
                            source_activity_id=activity.source_activity_id,
                            start_year=activity.start_time.year,
                            start_month=activity.start_time.month,
                            source_path=download_result.file_path,
                            reason="parse-failed",
                        )
                    checkpoint_updated_to = self._advance_checkpoint(
                        checkpoint_service,
                        session,
                        activity=activity,
                    )
                    log_event(
                        logger,
                        logging.ERROR,
                        "worker.sync.activity_skipped",
                        source_activity_id=activity.source_activity_id,
                        error_type=type(exc).__name__,
                        quarantine_path=str(quarantine_path) if quarantine_path else None,
                        checkpoint_updated_to=checkpoint_updated_to.isoformat(),
                    )
                    continue

            if not new_activities and fetch_result.activities:
                latest_activity = fetch_result.activities[-1]
                checkpoint = checkpoint_service.upsert_checkpoint(
                    GARMIN_ACTIVITY_SYNC_KEY,
                    last_synced_at=latest_activity.start_time,
                    last_source_id=latest_activity.source_activity_id,
                )
                session.commit()
                checkpoint_updated_to = checkpoint.last_synced_at

            log_event(
                logger,
                logging.INFO,
                "worker.sync.completed",
                fetched_count=fetched_count,
                new_count=new_count,
                downloaded_count=downloaded_count,
                ingested_count=ingested_count,
                sync_limit=self._settings.garmin_sync_limit,
                checkpoint_updated_to=checkpoint_updated_to.isoformat()
                if checkpoint_updated_to
                else None,
            )
            return SyncWorkerResult(
                fetched_count=fetched_count,
                new_count=new_count,
                downloaded_count=downloaded_count,
                ingested_count=ingested_count,
                checkpoint_updated_to=checkpoint_updated_to,
            )
        except Exception:
            session.rollback()
            log_event(
                logger,
                logging.ERROR,
                "worker.sync.failed",
                fetched_count=fetched_count,
                new_count=new_count,
                downloaded_count=downloaded_count,
                ingested_count=ingested_count,
                sync_limit=self._settings.garmin_sync_limit,
            )
            raise
        finally:
            session.close()


def run_sync_worker() -> SyncWorkerResult:
    settings = get_settings()
    configure_logging(settings.log_level)
    return GarminSyncWorker(
        session_factory=get_session_factory(),
        settings=settings,
    ).run_once()


def main() -> None:
    result = run_sync_worker()
    print(
        "Sync completed:",
        {
            "fetched_count": result.fetched_count,
            "new_count": result.new_count,
            "downloaded_count": result.downloaded_count,
            "ingested_count": result.ingested_count,
            "checkpoint_updated_to": result.checkpoint_updated_to.isoformat()
            if result.checkpoint_updated_to
            else None,
        },
    )


if __name__ == "__main__":
    main()
