from __future__ import annotations

from datetime import datetime, timezone
import logging
import time

from app.config import get_settings
from app.observability import configure_logging, log_event
from app.workers.sync_worker import run_sync_worker

logger = logging.getLogger(__name__)

DEFAULT_SYNC_INTERVAL_SECONDS = 6 * 60 * 60


def run_scheduled_sync(interval_seconds: int = DEFAULT_SYNC_INTERVAL_SECONDS) -> None:
    """Run the sync worker on a repeating schedule."""
    settings = get_settings()
    configure_logging(settings.log_level)

    log_event(
        logger,
        logging.INFO,
        "worker.schedule.started",
        interval_seconds=interval_seconds,
    )

    try:
        while True:
            started_at = datetime.now(timezone.utc)
            log_event(
                logger,
                logging.INFO,
                "worker.schedule.tick",
                started_at=started_at.isoformat(),
            )

            try:
                result = run_sync_worker()
                log_event(
                    logger,
                    logging.INFO,
                    "worker.schedule.tick.completed",
                    fetched_count=result.fetched_count,
                    new_count=result.new_count,
                    downloaded_count=result.downloaded_count,
                    ingested_count=result.ingested_count,
                    checkpoint_updated_to=result.checkpoint_updated_to.isoformat()
                    if result.checkpoint_updated_to
                    else None,
                )
            except Exception as exc:
                log_event(
                    logger,
                    logging.ERROR,
                    "worker.schedule.tick.failed",
                    error_type=type(exc).__name__,
                )

            log_event(
                logger,
                logging.INFO,
                "worker.schedule.sleeping",
                sleep_seconds=interval_seconds,
            )
            time.sleep(interval_seconds)
    except KeyboardInterrupt:
        log_event(logger, logging.INFO, "worker.schedule.stopped")


def main() -> None:
    run_scheduled_sync()


if __name__ == "__main__":
    main()
