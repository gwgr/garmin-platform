from __future__ import annotations

from datetime import datetime, timezone

from app.print_sync_status import render_sync_status
from app.services import SyncStatusResult


def test_render_sync_status_includes_key_operator_fields() -> None:
    result = SyncStatusResult(
        sync_key="garmin_activities",
        state="error",
        summary="The latest sync attempt failed.",
        is_stale=True,
        last_attempted_at=datetime(2026, 3, 21, 8, 15, tzinfo=timezone.utc),
        last_succeeded_at=datetime(2026, 3, 20, 18, 0, tzinfo=timezone.utc),
        last_synced_at=datetime(2026, 3, 20, 17, 45, tzinfo=timezone.utc),
        last_source_id="22198027348",
        last_run_status="error",
        consecutive_failures=2,
        last_error_summary="garmin returned 429",
    )

    rendered = render_sync_status(result)

    assert "State: error" in rendered
    assert "Summary: The latest sync attempt failed." in rendered
    assert "Stale: yes" in rendered
    assert "Last source activity id: 22198027348" in rendered
    assert "Consecutive failures: 2" in rendered
    assert "Last error summary: garmin returned 429" in rendered
