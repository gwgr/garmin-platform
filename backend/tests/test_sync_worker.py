from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.models import Activity, Base, SyncCheckpoint
from app.parsers import CorruptFitFileError
from app.services import (
    ActivityDeduplicationResult,
    ActivityFitDownloadResult,
    GARMIN_ACTIVITY_SYNC_KEY,
    GarminActivitySummary,
)
from app.workers import sync_worker as sync_worker_module


def _build_test_session_factory() -> sessionmaker[Session]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    return TestSession


def _test_settings() -> Settings:
    return Settings(
        app_env="test",
        app_host="0.0.0.0",
        app_port=8000,
        log_level="INFO",
        app_secret_key="test-secret",
        database_url="sqlite+pysqlite:///:memory:",
        raw_data_dir=Path("data/raw"),
        garth_home=Path("data/garth"),
        garmin_sync_limit=5,
        garmin_retry_delays_seconds=(1, 2, 3),
        garmin_email=None,
        garmin_password=None,
    )


def test_sync_worker_skips_duplicate_activity_that_slips_past_initial_dedup(monkeypatch) -> None:
    TestSession = _build_test_session_factory()
    session = TestSession()
    existing_start_time = datetime(2026, 3, 17, 6, 0, tzinfo=timezone.utc)
    try:
        session.add(
            Activity(
                source_activity_id="duplicate-1",
                name="Existing Activity",
                sport="walking",
                start_time=existing_start_time,
            )
        )
        session.commit()
    finally:
        session.close()

    duplicate_activity = GarminActivitySummary(
        source_activity_id="duplicate-1",
        name="Duplicate Activity",
        sport="walking",
        start_time=existing_start_time,
    )

    monkeypatch.setattr(sync_worker_module, "get_garmin_client", lambda: object())

    def fake_fetch_activities(self):
        return type(
            "FetchResult",
            (),
            {
                "activities": [duplicate_activity],
                "sync_key": GARMIN_ACTIVITY_SYNC_KEY,
                "is_backfill": False,
                "start": 0,
            },
        )()

    def fake_find_new_activities(self, activities):
        return ActivityDeduplicationResult(
            fetched_count=len(activities),
            existing_source_ids=set(),
            new_activities=list(activities),
        )

    def fail_if_download_called(self, activity):
        raise AssertionError("duplicate activity should be skipped before FIT download")

    monkeypatch.setattr(sync_worker_module.GarminActivityFetcher, "fetch_activities", fake_fetch_activities)
    monkeypatch.setattr(sync_worker_module.ActivityDeduper, "find_new_activities", fake_find_new_activities)
    monkeypatch.setattr(
        sync_worker_module.ActivityFitDownloader,
        "download_activity_fit",
        fail_if_download_called,
    )

    result = sync_worker_module.GarminSyncWorker(
        session_factory=TestSession,
        settings=_test_settings().__class__(**{**_test_settings().__dict__, "garmin_sync_limit": 2}),
    ).run_once()

    verification_session = TestSession()
    try:
        assert result.fetched_count == 1
        assert result.new_count == 1
        assert result.downloaded_count == 0
        assert result.ingested_count == 0
        assert result.checkpoint_updated_to == existing_start_time
        assert verification_session.scalar(select(func.count(Activity.id))) == 1

        checkpoint = verification_session.scalar(
            select(SyncCheckpoint).where(SyncCheckpoint.sync_key == GARMIN_ACTIVITY_SYNC_KEY)
        )
        assert checkpoint is not None
        assert checkpoint.last_source_id == "duplicate-1"
        assert checkpoint.last_synced_at is not None
        assert checkpoint.last_synced_at.isoformat() == "2026-03-17T06:00:00"
    finally:
        verification_session.close()


def test_sync_worker_skips_corrupt_fit_file_and_advances_checkpoint(
    monkeypatch, tmp_path: Path
) -> None:
    TestSession = _build_test_session_factory()
    corrupt_activity = GarminActivitySummary(
        source_activity_id="corrupt-1",
        name="Corrupt Activity",
        sport="walking",
        start_time=datetime(2026, 3, 18, 6, 0, tzinfo=timezone.utc),
    )
    corrupt_fit_path = tmp_path / "corrupt.fit"
    corrupt_fit_path.write_bytes(b"not-a-fit")

    monkeypatch.setattr(sync_worker_module, "get_garmin_client", lambda: object())

    def fake_fetch_activities(self):
        return type(
            "FetchResult",
            (),
            {
                "activities": [corrupt_activity],
                "sync_key": GARMIN_ACTIVITY_SYNC_KEY,
                "is_backfill": False,
                "start": 0,
            },
        )()

    def fake_find_new_activities(self, activities):
        return ActivityDeduplicationResult(
            fetched_count=len(activities),
            existing_source_ids=set(),
            new_activities=list(activities),
        )

    def fake_download_activity_fit(self, activity):
        return ActivityFitDownloadResult(
            activity=activity,
            file_path=str(corrupt_fit_path),
            already_existed=False,
        )

    def fake_ingest_activity_summary(self, *, activity, fit_path):
        raise CorruptFitFileError("corrupt fixture")

    monkeypatch.setattr(sync_worker_module.GarminActivityFetcher, "fetch_activities", fake_fetch_activities)
    monkeypatch.setattr(sync_worker_module.ActivityDeduper, "find_new_activities", fake_find_new_activities)
    monkeypatch.setattr(
        sync_worker_module.ActivityFitDownloader,
        "download_activity_fit",
        fake_download_activity_fit,
    )
    monkeypatch.setattr(
        sync_worker_module.ActivitySummaryIngestService,
        "ingest_activity_summary",
        fake_ingest_activity_summary,
    )

    result = sync_worker_module.GarminSyncWorker(
        session_factory=TestSession,
        settings=_test_settings().__class__(**{**_test_settings().__dict__, "garmin_sync_limit": 2}),
    ).run_once()

    verification_session = TestSession()
    try:
        assert result.fetched_count == 1
        assert result.new_count == 1
        assert result.downloaded_count == 1
        assert result.ingested_count == 0
        assert result.checkpoint_updated_to == corrupt_activity.start_time
        assert verification_session.scalar(select(func.count(Activity.id))) == 0

        checkpoint = verification_session.scalar(
            select(SyncCheckpoint).where(SyncCheckpoint.sync_key == GARMIN_ACTIVITY_SYNC_KEY)
        )
        assert checkpoint is not None
        assert checkpoint.last_source_id == "corrupt-1"
    finally:
        verification_session.close()


def test_sync_worker_backfill_keeps_latest_checkpoint_and_advances_offset(
    monkeypatch, tmp_path: Path
) -> None:
    TestSession = _build_test_session_factory()
    session = TestSession()
    latest_activity_time = datetime(2026, 3, 21, 8, 27, 2, tzinfo=timezone.utc)
    older_duplicate_time = datetime(2026, 3, 20, 6, 0, tzinfo=timezone.utc)
    new_older_time = datetime(2026, 3, 19, 6, 0, tzinfo=timezone.utc)
    try:
        session.add(
            Activity(
                source_activity_id="existing-recent",
                name="Existing Recent",
                sport="walking",
                start_time=latest_activity_time,
            )
        )
        session.add(
            SyncCheckpoint(
                sync_key=GARMIN_ACTIVITY_SYNC_KEY,
                last_synced_at=latest_activity_time,
                last_source_id="existing-recent",
                backfill_offset=25,
            )
        )
        session.commit()
    finally:
        session.close()

    duplicate_activity = GarminActivitySummary(
        source_activity_id="duplicate-older",
        name="Duplicate Older",
        sport="walking",
        start_time=older_duplicate_time,
    )
    new_activity = GarminActivitySummary(
        source_activity_id="new-older",
        name="New Older",
        sport="walking",
        start_time=new_older_time,
    )
    fit_path = tmp_path / "new-older.fit"
    fit_path.write_bytes(b"fit-payload")

    monkeypatch.setattr(sync_worker_module, "get_garmin_client", lambda: object())

    def fake_fetch_activities(self):
        return type(
            "FetchResult",
            (),
            {
                "activities": [new_activity, duplicate_activity],
                "sync_key": GARMIN_ACTIVITY_SYNC_KEY,
                "is_backfill": True,
                "start": 25,
            },
        )()

    def fake_find_new_activities(self, activities):
        return ActivityDeduplicationResult(
            fetched_count=len(activities),
            existing_source_ids={"duplicate-older"},
            new_activities=[new_activity],
        )

    def fake_download_activity_fit(self, activity):
        return ActivityFitDownloadResult(
            activity=activity,
            file_path=str(fit_path),
            already_existed=False,
        )

    def fake_ingest_activity_summary(self, *, activity, fit_path):
        persisted_activity = Activity(
            source_activity_id=activity.source_activity_id,
            name=activity.name,
            sport=activity.sport,
            start_time=activity.start_time,
            raw_file_path=str(fit_path),
        )
        self._session.add(persisted_activity)
        self._session.flush()
        return persisted_activity

    monkeypatch.setattr(sync_worker_module.GarminActivityFetcher, "fetch_activities", fake_fetch_activities)
    monkeypatch.setattr(sync_worker_module.ActivityDeduper, "find_new_activities", fake_find_new_activities)
    monkeypatch.setattr(
        sync_worker_module.ActivityFitDownloader,
        "download_activity_fit",
        fake_download_activity_fit,
    )
    monkeypatch.setattr(
        sync_worker_module.ActivitySummaryIngestService,
        "ingest_activity_summary",
        fake_ingest_activity_summary,
    )
    monkeypatch.setattr(
        sync_worker_module.ActivityLapIngestService,
        "ingest_activity_laps",
        lambda self, *, activity, fit_path: [],
    )
    monkeypatch.setattr(
        sync_worker_module.ActivityRecordIngestService,
        "ingest_activity_records",
        lambda self, *, activity, fit_path: [],
    )

    backfill_settings = _test_settings().__class__(
        **{**_test_settings().__dict__, "garmin_sync_limit": 2}
    )
    result = sync_worker_module.GarminSyncWorker(
        session_factory=TestSession,
        settings=backfill_settings,
    ).run_once()

    verification_session = TestSession()
    try:
        checkpoint = verification_session.scalar(
            select(SyncCheckpoint).where(SyncCheckpoint.sync_key == GARMIN_ACTIVITY_SYNC_KEY)
        )
        assert checkpoint is not None
        assert result.fetched_count == 2
        assert result.new_count == 1
        assert result.downloaded_count == 1
        assert result.ingested_count == 1
        assert result.checkpoint_updated_to == latest_activity_time
        assert checkpoint.last_synced_at is not None
        assert checkpoint.last_synced_at.isoformat() == "2026-03-21T08:27:02"
        assert checkpoint.last_source_id == "existing-recent"
        assert checkpoint.backfill_offset == 27
        assert verification_session.scalar(select(func.count(Activity.id))) == 2
    finally:
        verification_session.close()
