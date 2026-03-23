from __future__ import annotations

from datetime import datetime, timezone


def normalize_datetime_for_json(value: datetime | None) -> str | None:
    if value is None:
        return None

    if value.tzinfo is None:
        normalized = value.replace(tzinfo=timezone.utc)
    else:
        normalized = value.astimezone(timezone.utc)

    return normalized.isoformat().replace("+00:00", "Z")
