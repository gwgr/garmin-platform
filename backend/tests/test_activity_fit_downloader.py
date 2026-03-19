from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.parsers import FitParserService
from app.services import ActivityFitDownloader, GarminActivitySummary, GarminDownloadError
from app.services.raw_file_storage import RawFileStorageService


class _FakeGarminClient:
    def __init__(self, payload: bytes) -> None:
        self._payload = payload

    def download_activity_fit(self, source_activity_id: str) -> bytes:
        return self._payload


def test_download_activity_fit_quarantines_invalid_payload(tmp_path) -> None:
    downloader = ActivityFitDownloader(
        _FakeGarminClient(b"not-a-fit"),
        RawFileStorageService(tmp_path),
        FitParserService(),
    )
    activity = GarminActivitySummary(
        source_activity_id="invalid-1",
        name="Invalid",
        sport="walking",
        start_time=datetime(2026, 3, 17, 6, 0, tzinfo=timezone.utc),
    )

    with pytest.raises(GarminDownloadError):
        downloader.download_activity_fit(activity)

    quarantine_path = (
        tmp_path / "_quarantine" / "activities" / "2026" / "03" / "invalid-1.invalid-download.fit"
    )
    assert quarantine_path.exists()
    assert quarantine_path.read_bytes() == b"not-a-fit"
