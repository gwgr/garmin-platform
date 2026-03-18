from __future__ import annotations

from pathlib import Path
import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.config import Settings
from app.observability import log_event


logger = logging.getLogger(__name__)


class StartupValidationError(RuntimeError):
    """Raised when a required startup validation fails."""


def _ensure_directory(path: Path, *, label: str) -> None:
    try:
        path.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        log_event(
            logger,
            logging.ERROR,
            "startup.directory_check.failed",
            path=str(path),
            label=label,
            error_type=type(exc).__name__,
        )
        raise StartupValidationError(
            f"Unable to prepare required directory for {label}: {path}"
        ) from exc

    if not path.is_dir():
        log_event(
            logger,
            logging.ERROR,
            "startup.directory_check.not_directory",
            path=str(path),
            label=label,
        )
        raise StartupValidationError(f"Required path for {label} is not a directory: {path}")

    log_event(
        logger,
        logging.INFO,
        "startup.directory_check.passed",
        path=str(path),
        label=label,
    )


def _check_database(engine: Engine) -> None:
    try:
        with engine.connect() as connection:
            connection.execute(text("select 1"))
    except Exception as exc:
        log_event(
            logger,
            logging.ERROR,
            "startup.database_check.failed",
            error_type=type(exc).__name__,
        )
        raise StartupValidationError("Database connectivity check failed during startup.") from exc

    log_event(logger, logging.INFO, "startup.database_check.passed")


def validate_startup(settings: Settings, engine: Engine) -> None:
    """Validate critical runtime dependencies before serving requests."""
    _ensure_directory(settings.raw_data_dir, label="raw_data_dir")
    _ensure_directory(settings.garth_home, label="garth_home")
    _check_database(engine)
    log_event(
        logger,
        logging.INFO,
        "startup.validation.completed",
        raw_data_dir=str(settings.raw_data_dir),
        garth_home=str(settings.garth_home),
    )
