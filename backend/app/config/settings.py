from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_env: str
    app_host: str
    app_port: int
    app_secret_key: str
    database_url: str
    raw_data_dir: Path
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

    return Settings(
        app_env=_get_env("APP_ENV", "development") or "development",
        app_host=_get_env("APP_HOST", "0.0.0.0") or "0.0.0.0",
        app_port=int(_get_env("APP_PORT", "8000") or "8000"),
        app_secret_key=_get_env("APP_SECRET_KEY", "replace-with-a-long-random-secret")
        or "replace-with-a-long-random-secret",
        database_url=_get_env(
            "DATABASE_URL",
            "postgresql+psycopg://garmin:garmin_local_dev_password@localhost:5432/garmin_platform",
        )
        or "postgresql+psycopg://garmin:garmin_local_dev_password@localhost:5432/garmin_platform",
        raw_data_dir=raw_data_dir,
        garmin_email=_get_env("GARMIN_EMAIL"),
        garmin_password=_get_env("GARMIN_PASSWORD"),
    )
