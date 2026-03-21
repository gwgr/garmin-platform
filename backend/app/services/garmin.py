from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
import io
import logging
from pathlib import Path
import time
from typing import Callable, Protocol
from zipfile import ZipFile, is_zipfile

from requests import HTTPError, RequestException

from app.config import get_settings
from app.observability import log_event


logger = logging.getLogger(__name__)
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


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
    def list_activities(
        self,
        since: datetime | None = None,
        limit: int = 100,
        start: int = 0,
    ) -> list[GarminActivitySummary]:
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

    def list_activities(
        self,
        since: datetime | None = None,
        limit: int = 100,
        start: int = 0,
    ) -> list[GarminActivitySummary]:
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
        retry_delays_seconds: tuple[int, ...],
        sleep_func: Callable[[float], None] = time.sleep,
    ) -> None:
        self._email = email
        self._password = password
        self._garth_home = garth_home
        self._retry_delays_seconds = retry_delays_seconds
        self._sleep = sleep_func

    def _get_garth_module(self):
        original_garth_home = os.environ.pop("GARTH_HOME", None)
        try:
            import garth  # type: ignore
        finally:
            if original_garth_home is not None:
                os.environ["GARTH_HOME"] = original_garth_home
        return garth

    def _extract_status_code(self, exc: Exception) -> int | None:
        if isinstance(exc, HTTPError) and exc.response is not None:
            return exc.response.status_code
        return None

    def _should_retry(self, exc: Exception) -> bool:
        status_code = self._extract_status_code(exc)
        if status_code in RETRYABLE_STATUS_CODES:
            return True
        return isinstance(exc, RequestException)

    def _perform_with_backoff(self, operation_name: str, func, **context):
        total_attempts = len(self._retry_delays_seconds) + 1
        for attempt in range(1, total_attempts + 1):
            try:
                return func()
            except Exception as exc:
                should_retry = self._should_retry(exc)
                status_code = self._extract_status_code(exc)
                if not should_retry or attempt >= total_attempts:
                    log_event(
                        logger,
                        logging.ERROR,
                        f"{operation_name}.failed",
                        attempt=attempt,
                        max_attempts=total_attempts,
                        error_type=type(exc).__name__,
                        status_code=status_code,
                        **context,
                    )
                    raise

                sleep_seconds = self._retry_delays_seconds[attempt - 1]
                log_event(
                    logger,
                    logging.WARNING,
                    f"{operation_name}.retrying",
                    attempt=attempt,
                    max_attempts=total_attempts,
                    sleep_seconds=sleep_seconds,
                    error_type=type(exc).__name__,
                    status_code=status_code,
                    **context,
                )
                self._sleep(sleep_seconds)

    def _has_saved_session(self) -> bool:
        return all(
            (self._garth_home / filename).exists()
            for filename in ("oauth1_token.json", "oauth2_token.json")
        )

    @property
    def is_configured(self) -> bool:
        return self._has_saved_session() or bool(self._email and self._password)

    def bootstrap_session(self, force_login: bool = False) -> bool:
        """Ensure a persisted Garmin session exists.

        Returns True when an existing session was reused and False when a fresh
        login was required to create or refresh the session files.
        """
        garth = self._get_garth_module()
        self._garth_home.mkdir(parents=True, exist_ok=True)
        token_dir = str(self._garth_home)

        if not force_login:
            try:
                garth.resume(token_dir)
                log_event(
                    logger,
                    logging.INFO,
                    "garmin.auth.bootstrap.resumed",
                    garth_home=token_dir,
                )
                return True
            except Exception:
                pass

        if not (self._email and self._password):
            raise GarminClientNotConfiguredError(
                "Garmin bootstrap requires either a saved GARTH_HOME session or both GARMIN_EMAIL and GARMIN_PASSWORD."
            )

        self._perform_with_backoff(
            "garmin.auth.bootstrap.login",
            lambda: garth.login(self._email, self._password),
            garth_home=token_dir,
        )
        garth.save(token_dir)
        log_event(
            logger,
            logging.INFO,
            "garmin.auth.bootstrap.logged_in",
            garth_home=token_dir,
            force_login=force_login,
        )
        return False

    def _login(self) -> None:
        resumed_existing_session = self.bootstrap_session()
        garth = self._get_garth_module()
        log_event(
            logger,
            logging.INFO,
            "garmin.auth.resumed" if resumed_existing_session else "garmin.auth.logged_in",
            garth_home=str(self._garth_home),
        )
        return garth

    def list_activities(
        self,
        since: datetime | None = None,
        limit: int = 100,
        start: int = 0,
    ) -> list[GarminActivitySummary]:
        params: dict[str, str | int] = {"start": start, "limit": limit}
        if since is not None:
            params["startDate"] = since.date().isoformat()

        log_event(
            logger,
            logging.INFO,
            "garmin.list_activities.started",
            since=since.isoformat() if since else None,
            start=params["start"],
            limit=params["limit"],
        )
        response = self._perform_with_backoff(
            "garmin.list_activities",
            lambda: self._login().connectapi(
                "/activitylist-service/activities/search/activities",
                params=params,
            ),
            since=since.isoformat() if since else None,
            start=params["start"],
            limit=params["limit"],
        )
        activities: list[GarminActivitySummary] = []
        for item in response:
            source_activity_id = str(item["activityId"])
            raw_start_time = item.get("startTimeGMT") or item.get("startTimeLocal")
            if raw_start_time is None:
                raise GarminDownloadError(
                    f"Garmin activity {source_activity_id} did not include a usable start timestamp."
                )
            start_time = datetime.fromisoformat(raw_start_time.replace("Z", "+00:00"))
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
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
            start=params["start"],
        )
        return activities

    def download_activity_fit(self, source_activity_id: str) -> bytes:
        log_event(
            logger,
            logging.INFO,
            "garmin.download_activity_fit.started",
            source_activity_id=source_activity_id,
        )
        try:
            payload = self._perform_with_backoff(
                "garmin.download_activity_fit",
                lambda: self._login().download(
                    f"/download-service/files/activity/{source_activity_id}",
                    params={"format": "original"},
                ),
                source_activity_id=source_activity_id,
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
    return GarthGarminClient(
        email=settings.garmin_email,
        password=settings.garmin_password,
        garth_home=settings.garth_home,
        retry_delays_seconds=settings.garmin_retry_delays_seconds,
    )
