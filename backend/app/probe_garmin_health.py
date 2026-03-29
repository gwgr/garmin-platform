from __future__ import annotations

import argparse
from dataclasses import asdict, is_dataclass
from datetime import date, datetime
import json
import logging
from typing import Any, Callable

from app.config import get_settings
from app.observability import configure_logging
from app.services.garmin import GarthGarminClient, GarminClientNotConfiguredError, get_garmin_client


logger = logging.getLogger(__name__)

AVAILABLE_SECTIONS = (
    "hrv_detail",
    "sleep_detail",
    "daily_hrv",
    "daily_sleep",
    "weight",
    "settings",
    "training_readiness",
    "garmin_scores",
)

DEFAULT_SECTIONS = (
    "hrv_detail",
    "sleep_detail",
    "daily_hrv",
    "daily_sleep",
    "weight",
    "settings",
    "garmin_scores",
)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Probe Garmin health and physiology payload availability using the current "
            "GARTH_HOME session or configured Garmin credentials."
        )
    )
    parser.add_argument(
        "--date",
        dest="target_date",
        type=date.fromisoformat,
        default=date.today(),
        help="End date to probe in YYYY-MM-DD format. Defaults to today.",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Number of recent days to request for list-style endpoints. Defaults to 7.",
    )
    parser.add_argument(
        "--section",
        dest="sections",
        action="append",
        choices=AVAILABLE_SECTIONS,
        help=(
            "Section to fetch. Repeat to request multiple sections. "
            f"Defaults to: {', '.join(DEFAULT_SECTIONS)}."
        ),
    )
    return parser.parse_args()


def _json_default(value: Any) -> Any:
    if is_dataclass(value):
        return asdict(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _require_garth_client() -> tuple[GarthGarminClient, Any]:
    settings = get_settings()
    configure_logging(settings.log_level)

    client = get_garmin_client()
    if not isinstance(client, GarthGarminClient):
        raise GarminClientNotConfiguredError(
            "Garmin health probing requires the garth-backed Garmin client."
        )

    client.bootstrap_session()
    garth = client._get_garth_module()
    return client, garth


def _collect_sections(
    garth: Any,
    *,
    target_date: date,
    days: int,
    sections: list[str],
) -> tuple[dict[str, Any], dict[str, str]]:
    results: dict[str, Any] = {}
    errors: dict[str, str] = {}

    fetchers: dict[str, Callable[[], Any]] = {
        "hrv_detail": lambda: garth.HRVData.list(target_date, days=days),
        "sleep_detail": lambda: garth.SleepData.list(target_date, days=days),
        "daily_hrv": lambda: garth.DailyHRV.list(target_date, period=days),
        "daily_sleep": lambda: garth.DailySleep.list(target_date, period=days),
        "weight": lambda: garth.WeightData.list(target_date, days=days),
        "settings": lambda: garth.UserSettings.get(),
        "training_readiness": lambda: garth.TrainingReadinessData.list(
            target_date, days=days
        ),
        "garmin_scores": lambda: garth.GarminScoresData.list(target_date, days=days),
    }

    for section in sections:
        try:
            results[section] = fetchers[section]()
        except Exception as exc:  # pragma: no cover - external integration path
            errors[section] = f"{type(exc).__name__}: {exc}"

    return results, errors


def main() -> None:
    args = _parse_args()
    sections = args.sections or list(DEFAULT_SECTIONS)
    _, garth = _require_garth_client()
    results, errors = _collect_sections(
        garth,
        target_date=args.target_date,
        days=args.days,
        sections=sections,
    )

    payload = {
        "target_date": args.target_date.isoformat(),
        "days": args.days,
        "sections": sections,
        "results": results,
        "errors": errors,
    }
    print(json.dumps(payload, indent=2, default=_json_default, sort_keys=True))


if __name__ == "__main__":
    main()
