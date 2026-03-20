from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Activity, ActivityLap, ActivityRecord, Base
from app.services import ActivityReprocessService


FIXTURE_FIT_PATH = Path(__file__).resolve().parent / "fixtures" / "22198027348.fit"


def _build_test_session_factory() -> sessionmaker[Session]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    return TestSession


def test_reprocess_rebuilds_normalized_data_from_stored_fit_file() -> None:
    TestSession = _build_test_session_factory()
    session = TestSession()
    try:
        activity = Activity(
            source_activity_id=FIXTURE_FIT_PATH.stem,
            name="Fixture Activity",
            sport="walking",
            start_time=datetime(2026, 3, 17, 0, 17, 57, tzinfo=timezone.utc),
            distance_meters=1.0,
            duration_seconds=1.0,
            calories=1,
            raw_file_path=str(FIXTURE_FIT_PATH),
        )
        session.add(activity)
        session.flush()
        session.add(
            ActivityLap(
                activity_id=activity.id,
                lap_index=1,
                distance_meters=10.0,
                duration_seconds=10.0,
            )
        )
        session.add(
            ActivityRecord(
                activity_id=activity.id,
                record_time=datetime(2026, 3, 17, 0, 17, 57, tzinfo=timezone.utc),
                distance_meters=10.0,
            )
        )
        session.commit()
    finally:
        session.close()

    result = ActivityReprocessService(session_factory=TestSession).reprocess_activities(
        source_activity_id=FIXTURE_FIT_PATH.stem
    )

    verification_session = TestSession()
    try:
        persisted_activity = verification_session.scalar(
            select(Activity).where(Activity.source_activity_id == FIXTURE_FIT_PATH.stem)
        )

        assert persisted_activity is not None
        assert persisted_activity.distance_meters == 3301.6
        assert persisted_activity.duration_seconds == 2899.633
        assert verification_session.scalar(select(func.count(ActivityLap.id))) == 4
        assert verification_session.scalar(select(func.count(ActivityRecord.id))) == 481
        assert result.selected_count == 1
        assert result.reprocessed_count == 1
        assert result.skipped_count == 0
        assert result.failed_count == 0
    finally:
        verification_session.close()


def test_reprocess_skips_missing_raw_fit_file() -> None:
    TestSession = _build_test_session_factory()
    session = TestSession()
    try:
        activity = Activity(
            source_activity_id="missing-fit-1",
            name="Missing FIT",
            sport="walking",
            start_time=datetime(2026, 3, 17, 0, 17, 57, tzinfo=timezone.utc),
            distance_meters=1.0,
            duration_seconds=1.0,
            calories=1,
            raw_file_path=str(FIXTURE_FIT_PATH.parent / "missing.fit"),
        )
        session.add(activity)
        session.commit()
    finally:
        session.close()

    result = ActivityReprocessService(session_factory=TestSession).reprocess_activities(
        source_activity_id="missing-fit-1"
    )

    assert result.selected_count == 1
    assert result.reprocessed_count == 0
    assert result.skipped_count == 1
    assert result.failed_count == 0
