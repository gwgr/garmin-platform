from __future__ import annotations

from app.config import get_settings
from app.db import get_session_factory
from app.observability import configure_logging
from app.services.frontend_fixture_seed import FrontendFixtureSeedService


def main() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)

    result = FrontendFixtureSeedService(get_session_factory()).seed()
    print(
        "Frontend fixture seed completed:",
        {
            "activity_count": result.activity_count,
            "lap_count": result.lap_count,
            "record_count": result.record_count,
            "daily_metric_count": result.daily_metric_count,
            "sleep_session_count": result.sleep_session_count,
        },
    )


if __name__ == "__main__":
    main()
