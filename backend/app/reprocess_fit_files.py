from __future__ import annotations

import argparse

from app.config import get_settings
from app.db import get_session_factory
from app.observability import configure_logging
from app.services import ActivityReprocessService


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Rebuild normalized activity data from stored raw FIT files.",
    )
    parser.add_argument(
        "--source-activity-id",
        help="Reprocess a single activity by Garmin source activity id.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit the number of activities reprocessed in this run.",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    settings = get_settings()
    configure_logging(settings.log_level)
    result = ActivityReprocessService(session_factory=get_session_factory()).reprocess_activities(
        source_activity_id=args.source_activity_id,
        limit=args.limit,
    )
    print(
        "Reprocess completed:",
        {
            "selected_count": result.selected_count,
            "reprocessed_count": result.reprocessed_count,
            "skipped_count": result.skipped_count,
            "failed_count": result.failed_count,
        },
    )


if __name__ == "__main__":
    main()
