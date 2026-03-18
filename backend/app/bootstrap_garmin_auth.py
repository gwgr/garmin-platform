from __future__ import annotations

import logging

from app.config import get_settings
from app.observability import configure_logging, log_event
from app.services.garmin import GarthGarminClient, GarminClientNotConfiguredError, get_garmin_client


logger = logging.getLogger(__name__)


def bootstrap_garmin_auth(force_login: bool = False) -> bool:
    """Create or refresh the persisted GARTH_HOME session files."""
    settings = get_settings()
    configure_logging(settings.log_level)

    client = get_garmin_client()
    if not isinstance(client, GarthGarminClient):
        raise GarminClientNotConfiguredError(
            "Garmin auth bootstrap requires the garth-backed Garmin client."
        )

    reused_saved_session = client.bootstrap_session(force_login=force_login)
    log_event(
        logger,
        logging.INFO,
        "garmin.auth.bootstrap.completed",
        garth_home=str(settings.garth_home),
        reused_saved_session=reused_saved_session,
        force_login=force_login,
    )
    return reused_saved_session


def main() -> None:
    bootstrap_garmin_auth()


if __name__ == "__main__":
    main()
