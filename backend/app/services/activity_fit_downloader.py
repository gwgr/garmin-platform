from __future__ import annotations

from dataclasses import dataclass
import logging

from app.parsers import CorruptFitFileError, FitParserService
from app.observability import log_event
from app.services.garmin import GarminActivitySummary, GarminClient, GarminDownloadError
from app.services.raw_file_storage import RawFileSaveResult, RawFileStorageService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ActivityFitDownloadResult:
    activity: GarminActivitySummary
    file_path: str
    already_existed: bool


class ActivityFitDownloader:
    """Download and persist raw FIT files for Garmin activities."""

    def __init__(
        self,
        garmin_client: GarminClient,
        raw_file_storage: RawFileStorageService,
        fit_parser: FitParserService,
    ) -> None:
        self._garmin_client = garmin_client
        self._raw_file_storage = raw_file_storage
        self._fit_parser = fit_parser

    def download_activity_fit(self, activity: GarminActivitySummary) -> ActivityFitDownloadResult:
        log_event(
            logger,
            logging.INFO,
            "sync.download_activity_fit.started",
            source_activity_id=activity.source_activity_id,
            sport=activity.sport,
            start_time=activity.start_time.isoformat(),
        )
        payload = self._garmin_client.download_activity_fit(activity.source_activity_id)
        try:
            if not payload:
                raise GarminDownloadError(
                    f"Garmin returned an empty FIT payload for activity {activity.source_activity_id}."
                )
            self._fit_parser.validate_fit_payload(payload)
        except (GarminDownloadError, CorruptFitFileError) as exc:
            quarantine_path = self._raw_file_storage.save_quarantined_activity_payload(
                source_activity_id=activity.source_activity_id,
                start_year=activity.start_time.year,
                start_month=activity.start_time.month,
                payload=payload,
                reason="invalid-download",
            )
            log_event(
                logger,
                logging.ERROR,
                "sync.download_activity_fit.invalid_payload",
                source_activity_id=activity.source_activity_id,
                quarantine_path=str(quarantine_path),
                error_type=type(exc).__name__,
            )
            raise GarminDownloadError(
                f"Downloaded FIT payload for activity {activity.source_activity_id} failed validation."
            ) from exc
        save_result: RawFileSaveResult = self._raw_file_storage.save_activity_fit(
            source_activity_id=activity.source_activity_id,
            start_year=activity.start_time.year,
            start_month=activity.start_time.month,
            payload=payload,
        )
        log_event(
            logger,
            logging.INFO,
            "sync.download_activity_fit.completed",
            source_activity_id=activity.source_activity_id,
            file_path=str(save_result.path),
            already_existed=save_result.already_existed,
        )
        return ActivityFitDownloadResult(
            activity=activity,
            file_path=str(save_result.path),
            already_existed=save_result.already_existed,
        )
