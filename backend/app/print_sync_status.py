from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import datetime

from app.config import get_settings
from app.db import get_session_factory
from app.observability import configure_logging
from app.services import SyncStatusResult, SyncStatusService


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Print the current Garmin sync checkpoint status.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the sync status as JSON instead of a human-friendly summary.",
    )
    return parser


def _format_timestamp(value: datetime | None) -> str:
    return value.isoformat() if value is not None else "--"


def render_sync_status(result: SyncStatusResult) -> str:
    return "\n".join(
        [
            f"State: {result.state}",
            f"Summary: {result.summary}",
            f"Stale: {'yes' if result.is_stale else 'no'}",
            f"Last attempted: {_format_timestamp(result.last_attempted_at)}",
            f"Last succeeded: {_format_timestamp(result.last_succeeded_at)}",
            f"Last synced activity time: {_format_timestamp(result.last_synced_at)}",
            f"Last source activity id: {result.last_source_id or '--'}",
            f"Backfill offset: {result.backfill_offset if result.backfill_offset is not None else '--'}",
            f"Last run status: {result.last_run_status or '--'}",
            f"Consecutive failures: {result.consecutive_failures}",
            f"Last error summary: {result.last_error_summary or '--'}",
        ]
    )


def _result_to_json(result: SyncStatusResult) -> str:
    payload = asdict(result)
    for key, value in payload.items():
        if isinstance(value, datetime):
            payload[key] = value.isoformat()
    return json.dumps(payload, indent=2, sort_keys=True)


def main() -> None:
    args = build_parser().parse_args()
    settings = get_settings()
    configure_logging(settings.log_level)

    session = get_session_factory()()
    try:
        result = SyncStatusService(session).get_sync_status()
    finally:
        session.close()

    if args.json:
        print(_result_to_json(result))
        return

    print(render_sync_status(result))


if __name__ == "__main__":
    main()
