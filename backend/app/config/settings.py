from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


def _get_int_tuple_env(name: str, default: tuple[int, ...]) -> tuple[int, ...]:
    raw_value = _get_env(name)
    if raw_value is None:
        return default

    parts = [part.strip() for part in raw_value.split(",")]
    values = tuple(int(part) for part in parts if part)
    return values or default


@dataclass(frozen=True)
class Settings:
    app_env: str
    app_host: str
    app_port: int
    log_level: str
    app_secret_key: str
    database_url: str
    raw_data_dir: Path
    garth_home: Path
    garmin_sync_limit: int
    garmin_retry_delays_seconds: tuple[int, ...]
    garmin_email: str | None
    garmin_password: str | None

    @property
    def is_development(self) -> bool:
        return self.app_env.lower() == "development"


def _get_env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name, default)
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or default


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Build and cache backend settings from environment variables."""
    raw_data_dir = Path(_get_env("RAW_DATA_DIR", "./data/raw") or "./data/raw")
    garth_home = Path(_get_env("GARTH_HOME", "./data/garth") or "./data/garth")

    return Settings(
        app_env=_get_env("APP_ENV", "development") or "development",
        app_host=_get_env("APP_HOST", "0.0.0.0") or "0.0.0.0",
        app_port=int(_get_env("APP_PORT", "8000") or "8000"),
        log_level=_get_env("LOG_LEVEL", "INFO") or "INFO",
        app_secret_key=_get_env("APP_SECRET_KEY", "replace-with-a-long-random-secret")
        or "replace-with-a-long-random-secret",
        database_url=_get_env(
            "DATABASE_URL",
            "postgresql+psycopg://garmin:garmin_local_dev_password@localhost:5432/garmin_platform",
        )
        or "postgresql+psycopg://garmin:garmin_local_dev_password@localhost:5432/garmin_platform",
        raw_data_dir=raw_data_dir,
        garth_home=garth_home,
        garmin_sync_limit=int(_get_env("GARMIN_SYNC_LIMIT", "100") or "100"),
        garmin_retry_delays_seconds=_get_int_tuple_env("GARMIN_RETRY_DELAYS_SECONDS", (15, 30, 60)),
        garmin_email=_get_env("GARMIN_EMAIL"),
        garmin_password=_get_env("GARMIN_PASSWORD"),
    )
