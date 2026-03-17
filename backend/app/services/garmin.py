from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
import io
import logging
from pathlib import Path
from typing import Protocol
from zipfile import ZipFile, is_zipfile

from app.config import get_settings
from app.observability import log_event


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GarminActivitySummary:
    source_activity_id: str
    name: str | None
    sport: str
    start_time: datetime
    duration_seconds: float | None = None
    distance_meters: float | None = None
    calories: int | None = None


class GarminClient(Protocol):
    def list_activities(self, since: datetime | None = None) -> list[GarminActivitySummary]:
        """Return Garmin activities, optionally filtered by a checkpoint."""

    def download_activity_fit(self, source_activity_id: str) -> bytes:
        """Download the raw FIT payload for a Garmin activity."""


class GarminClientNotConfiguredError(RuntimeError):
    """Raised when Garmin credentials are required but not configured."""


class GarminDownloadError(RuntimeError):
    """Raised when a Garmin FIT download cannot be completed."""


class PlaceholderGarminClient:
    """Placeholder Garmin client until a real Garmin adapter is implemented."""

    def __init__(self, email: str | None, password: str | None) -> None:
        self._email = email
        self._password = password

    @property
    def is_configured(self) -> bool:
        return bool(self._email and self._password)

    def _require_credentials(self) -> None:
        if not self.is_configured:
            raise GarminClientNotConfiguredError(
                "Garmin credentials are not configured. Set GARMIN_EMAIL and GARMIN_PASSWORD."
            )

    def list_activities(self, since: datetime | None = None) -> list[GarminActivitySummary]:
        self._require_credentials()
        raise NotImplementedError(
            "Garmin activity fetching is not implemented yet. Complete the Phase 4 sync tasks first."
        )

    def download_activity_fit(self, source_activity_id: str) -> bytes:
        self._require_credentials()
        raise NotImplementedError(
            "Garmin FIT downloads are not implemented yet. Complete the Phase 4 sync tasks first."
        )


class GarthGarminClient:
    """Garmin client backed by the garth library."""

    def __init__(
        self,
        *,
        email: str | None,
        password: str | None,
        garth_home: Path,
    ) -> None:
        self._email = email
        self._password = password
        self._garth_home = garth_home

    def _get_garth_module(self):
        original_garth_home = os.environ.pop("GARTH_HOME", None)
        try:
            import garth  # type: ignore
        finally:
            if original_garth_home is not None:
                os.environ["GARTH_HOME"] = original_garth_home
        return garth

    @property
    def is_configured(self) -> bool:
        return bool(self._email and self._password)

    def _login(self) -> None:
        garth = self._get_garth_module()
        self._garth_home.mkdir(parents=True, exist_ok=True)
        token_dir = str(self._garth_home)

        try:
            garth.resume(token_dir)
            log_event(
                logger,
                logging.INFO,
                "garmin.auth.resumed",
                garth_home=token_dir,
            )
            return garth
        except Exception:
            pass

        if not self.is_configured:
            raise GarminClientNotConfiguredError(
                "Garmin credentials are not configured. Set GARMIN_EMAIL and GARMIN_PASSWORD."
            )

        garth.login(self._email, self._password)
        garth.save(token_dir)
        log_event(
            logger,
            logging.INFO,
            "garmin.auth.logged_in",
            garth_home=token_dir,
        )
        return garth

    def list_activities(self, since: datetime | None = None) -> list[GarminActivitySummary]:
        garth = self._login()
        params: dict[str, str | int] = {"start": 0, "limit": 100}
        if since is not None:
            params["startDate"] = since.date().isoformat()

        log_event(
            logger,
            logging.INFO,
            "garmin.list_activities.started",
            since=since.isoformat() if since else None,
            limit=params["limit"],
        )
        response = garth.connectapi("/activitylist-service/activities/search/activities", params=params)
        activities: list[GarminActivitySummary] = []
        for item in response:
            source_activity_id = str(item["activityId"])
            start_time = datetime.fromisoformat(item["startTimeLocal"].replace("Z", "+00:00"))
            activities.append(
                GarminActivitySummary(
                    source_activity_id=source_activity_id,
                    name=item.get("activityName"),
                    sport=item.get("activityType", {}).get("typeKey", "unknown"),
                    start_time=start_time,
                    duration_seconds=item.get("duration"),
                    distance_meters=item.get("distance"),
                    calories=item.get("calories"),
                )
            )
        log_event(
            logger,
            logging.INFO,
            "garmin.list_activities.completed",
            fetched_count=len(activities),
            since=since.isoformat() if since else None,
        )
        return activities

    def download_activity_fit(self, source_activity_id: str) -> bytes:
        garth = self._login()
        log_event(
            logger,
            logging.INFO,
            "garmin.download_activity_fit.started",
            source_activity_id=source_activity_id,
        )
        try:
            payload = garth.download(
                f"/download-service/files/activity/{source_activity_id}",
                params={"format": "original"},
            )
        except Exception as exc:
            log_event(
                logger,
                logging.ERROR,
                "garmin.download_activity_fit.failed",
                source_activity_id=source_activity_id,
                error_type=type(exc).__name__,
            )
            raise GarminDownloadError(
                f"Unable to download FIT file for activity {source_activity_id}."
            ) from exc

        if isinstance(payload, bytes):
            normalized_payload = self._normalize_fit_payload(payload)
            log_event(
                logger,
                logging.INFO,
                "garmin.download_activity_fit.completed",
                source_activity_id=source_activity_id,
                payload_size_bytes=len(normalized_payload),
            )
            return normalized_payload
        raise GarminDownloadError(
            f"Garmin returned an unexpected payload type for activity {source_activity_id}."
        )

    def _normalize_fit_payload(self, payload: bytes) -> bytes:
        if not is_zipfile(io.BytesIO(payload)):
            return payload

        with ZipFile(io.BytesIO(payload)) as archive:
            fit_members = [name for name in archive.namelist() if name.lower().endswith(".fit")]
            if not fit_members:
                raise GarminDownloadError("Garmin returned a ZIP payload without a .fit file.")
            return archive.read(fit_members[0])


@lru_cache(maxsize=1)
def get_garmin_client() -> GarminClient:
    """Build and cache the Garmin client abstraction."""
    settings = get_settings()
    if settings.garmin_email and settings.garmin_password:
        return GarthGarminClient(
            email=settings.garmin_email,
            password=settings.garmin_password,
            garth_home=settings.garth_home,
        )
    return PlaceholderGarminClient(
        email=settings.garmin_email,
        password=settings.garmin_password,
    )
