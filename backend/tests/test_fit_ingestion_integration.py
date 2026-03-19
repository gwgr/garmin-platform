from __future__ import annotations

from pathlib import Path

from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Activity, ActivityLap, ActivityRecord, Base
from app.parsers import FitParserService
from app.services import (
    ActivityLapIngestService,
    ActivityRecordIngestService,
    ActivitySummaryIngestService,
    GarminActivitySummary,
)


FIXTURE_FIT_PATH = (
    Path(__file__).resolve().parent / "fixtures" / "22198027348.fit"
)


def _build_test_session() -> Session:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    return TestSession()


def test_full_fit_ingestion_persists_activity_laps_and_records() -> None:
    session = _build_test_session()
    try:
        parser = FitParserService()
        upstream_activity = GarminActivitySummary(
            source_activity_id=FIXTURE_FIT_PATH.stem,
            name="Fixture Activity",
            sport="walking",
            start_time=None,
            duration_seconds=None,
            distance_meters=None,
            calories=None,
        )

        activity = ActivitySummaryIngestService(session, parser).ingest_activity_summary(
            activity=upstream_activity,
            fit_path=FIXTURE_FIT_PATH,
        )
        laps = ActivityLapIngestService(session, parser).ingest_activity_laps(
            activity=activity,
            fit_path=FIXTURE_FIT_PATH,
        )
        records = ActivityRecordIngestService(session, parser).ingest_activity_records(
            activity=activity,
            fit_path=FIXTURE_FIT_PATH,
        )
        session.commit()

        persisted_activity = session.scalar(
            select(Activity).where(Activity.source_activity_id == FIXTURE_FIT_PATH.stem)
        )
        first_record_with_coordinates = session.scalar(
            select(ActivityRecord)
            .where(
                ActivityRecord.activity_id == activity.id,
                ActivityRecord.latitude_degrees.is_not(None),
                ActivityRecord.longitude_degrees.is_not(None),
            )
            .order_by(ActivityRecord.record_time.asc())
        )

        assert persisted_activity is not None
        assert persisted_activity.raw_file_path == str(FIXTURE_FIT_PATH)
        assert persisted_activity.distance_meters == 3301.6
        assert persisted_activity.duration_seconds == 2899.633
        assert session.scalar(select(func.count(ActivityLap.id))) == 4
        assert session.scalar(select(func.count(ActivityRecord.id))) == 481
        assert len(laps) == 4
        assert len(records) == 481
        assert first_record_with_coordinates is not None
        assert round(first_record_with_coordinates.latitude_degrees or 0.0, 6) == -37.773852
        assert round(first_record_with_coordinates.longitude_degrees or 0.0, 6) == 145.278261
    finally:
        session.close()
