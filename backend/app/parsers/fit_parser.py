from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import io
import logging
from pathlib import Path
from typing import Any
from zipfile import ZipFile, is_zipfile

from fitparse import FitFile

from app.observability import log_event


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ParsedActivitySummary:
    name: str | None
    sport: str
    start_time: datetime
    duration_seconds: float | None
    distance_meters: float | None
    calories: int | None


@dataclass(frozen=True)
class ParsedActivityLap:
    lap_index: int
    start_time: datetime | None
    duration_seconds: float | None
    distance_meters: float | None
    average_heart_rate: int | None
    max_heart_rate: int | None
    calories: int | None


@dataclass(frozen=True)
class ParsedActivityRecord:
    record_time: datetime
    elapsed_seconds: float | None
    distance_meters: float | None
    latitude_degrees: float | None
    longitude_degrees: float | None
    altitude_meters: float | None
    heart_rate: int | None
    cadence: int | None
    speed_mps: float | None
    power_watts: int | None
    temperature_celsius: float | None


class FitParserService:
    """Parse Garmin FIT files into normalized summary data."""

    def parse_activity_summary(self, fit_path: str | Path) -> ParsedActivitySummary:
        try:
            fit_file = FitFile(self._read_fit_bytes(fit_path))
            fit_file.parse()

            session_message = next(iter(fit_file.get_messages("session")), None)
            if session_message is None:
                raise ValueError(f"No session message found in FIT file: {fit_path}")

            values = {
                field.name: field.value
                for field in session_message
                if field.name and field.value is not None
            }

            start_time = self._require_datetime(values.get("start_time"), fit_path)
            sport = self._coerce_sport(values.get("sport"))

            return ParsedActivitySummary(
                name=self._coerce_optional_str(values.get("event")),
                sport=sport,
                start_time=start_time,
                duration_seconds=self._coerce_float(
                    values.get("total_timer_time") or values.get("total_elapsed_time")
                ),
                distance_meters=self._coerce_float(values.get("total_distance")),
                calories=self._coerce_int(values.get("total_calories")),
            )
        except Exception as exc:
            self._log_parser_failure("fit.parse_activity_summary.failed", fit_path, exc)
            raise

    def parse_activity_laps(self, fit_path: str | Path) -> list[ParsedActivityLap]:
        try:
            fit_file = FitFile(self._read_fit_bytes(fit_path))
            fit_file.parse()

            laps: list[ParsedActivityLap] = []
            for lap_index, lap_message in enumerate(fit_file.get_messages("lap"), start=1):
                values = {
                    field.name: field.value
                    for field in lap_message
                    if field.name and field.value is not None
                }
                laps.append(
                    ParsedActivityLap(
                        lap_index=lap_index,
                        start_time=self._coerce_datetime(values.get("start_time")),
                        duration_seconds=self._coerce_float(
                            values.get("total_timer_time") or values.get("total_elapsed_time")
                        ),
                        distance_meters=self._coerce_float(values.get("total_distance")),
                        average_heart_rate=self._coerce_int(values.get("avg_heart_rate")),
                        max_heart_rate=self._coerce_int(values.get("max_heart_rate")),
                        calories=self._coerce_int(values.get("total_calories")),
                    )
                )
            return laps
        except Exception as exc:
            self._log_parser_failure("fit.parse_activity_laps.failed", fit_path, exc)
            raise

    def parse_activity_records(self, fit_path: str | Path) -> list[ParsedActivityRecord]:
        try:
            fit_file = FitFile(self._read_fit_bytes(fit_path))
            fit_file.parse()

            records: list[ParsedActivityRecord] = []
            for record_message in fit_file.get_messages("record"):
                values = {
                    field.name: field.value
                    for field in record_message
                    if field.name and field.value is not None
                }
                record_time = self._coerce_datetime(values.get("timestamp"))
                if record_time is None:
                    continue

                records.append(
                    ParsedActivityRecord(
                        record_time=record_time,
                        elapsed_seconds=self._coerce_float(values.get("enhanced_elapsed_time")),
                        distance_meters=self._coerce_float(values.get("distance")),
                        latitude_degrees=self._coerce_coordinate_degrees(values.get("position_lat")),
                        longitude_degrees=self._coerce_coordinate_degrees(values.get("position_long")),
                        altitude_meters=self._coerce_float(
                            values.get("enhanced_altitude") or values.get("altitude")
                        ),
                        heart_rate=self._coerce_int(values.get("heart_rate")),
                        cadence=self._coerce_int(values.get("cadence")),
                        speed_mps=self._coerce_float(
                            values.get("enhanced_speed") or values.get("speed")
                        ),
                        power_watts=self._coerce_int(values.get("power")),
                        temperature_celsius=self._coerce_float(values.get("temperature")),
                    )
                )
            return records
        except Exception as exc:
            self._log_parser_failure("fit.parse_activity_records.failed", fit_path, exc)
            raise

    def _require_datetime(self, value: Any, fit_path: str | Path) -> datetime:
        if isinstance(value, datetime):
            return value
        raise ValueError(f"Missing start_time in FIT file: {fit_path}")

    def _coerce_datetime(self, value: Any) -> datetime | None:
        if isinstance(value, datetime):
            return value
        return None

    def _coerce_sport(self, value: Any) -> str:
        if value is None:
            return "unknown"
        return str(value)

    def _coerce_optional_str(self, value: Any) -> str | None:
        if value is None:
            return None
        return str(value)

    def _coerce_float(self, value: Any) -> float | None:
        if value is None:
            return None
        return float(value)

    def _coerce_int(self, value: Any) -> int | None:
        if value is None:
            return None
        return int(value)

    def _coerce_coordinate_degrees(self, value: Any) -> float | None:
        numeric_value = self._coerce_float(value)
        if numeric_value is None:
            return None

        if -180.0 <= numeric_value <= 180.0:
            return numeric_value

        return numeric_value * (180.0 / 2**31)

    def _read_fit_bytes(self, fit_path: str | Path) -> io.BytesIO:
        payload = Path(fit_path).read_bytes()
        if not is_zipfile(io.BytesIO(payload)):
            return io.BytesIO(payload)

        with ZipFile(io.BytesIO(payload)) as archive:
            fit_members = [name for name in archive.namelist() if name.lower().endswith(".fit")]
            if not fit_members:
                raise ValueError(f"No .fit member found in archive: {fit_path}")
            return io.BytesIO(archive.read(fit_members[0]))

    def _log_parser_failure(self, event: str, fit_path: str | Path, exc: Exception) -> None:
        logger.log(
            logging.ERROR,
            event,
            extra={
                "fit_path": str(fit_path),
                "error_type": type(exc).__name__,
            },
            exc_info=(type(exc), exc, exc.__traceback__),
        )
