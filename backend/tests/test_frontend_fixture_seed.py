from __future__ import annotations

from datetime import timedelta

from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Activity, ActivityLap, ActivityRecord, Base, DailyMetric, SleepSession, SyncCheckpoint
from app.services.frontend_fixture_seed import (
    FIXTURE_PREFIX,
    FIXTURE_TODAY,
    FrontendFixtureSeedService,
)


def _build_test_session_factory() -> sessionmaker[Session]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    return TestSession


def test_seed_frontend_fixture_creates_expected_records() -> None:
    TestSession = _build_test_session_factory()
    result = FrontendFixtureSeedService(TestSession).seed()

    session = TestSession()
    try:
        assert result.activity_count == 12
        assert session.scalar(select(func.count(Activity.id))) == 12
        assert session.scalar(select(func.count(ActivityLap.id))) == result.lap_count
        assert session.scalar(select(func.count(ActivityRecord.id))) == result.record_count
        assert session.scalar(select(func.count(DailyMetric.id))) == 7
        assert session.scalar(select(func.count(SleepSession.id))) == 7

        checkpoint = session.scalar(select(SyncCheckpoint).where(SyncCheckpoint.sync_key == "garmin_activities"))
        assert checkpoint is not None
        assert checkpoint.last_run_status == "success"
        assert checkpoint.last_source_id is not None
        assert checkpoint.last_source_id.startswith(FIXTURE_PREFIX)
    finally:
        session.close()


def test_seed_frontend_fixture_replaces_prior_fixture_records() -> None:
    TestSession = _build_test_session_factory()
    service = FrontendFixtureSeedService(TestSession)
    service.seed()
    service.seed()

    session = TestSession()
    try:
        assert session.scalar(select(func.count(Activity.id))) == 12
        assert session.scalar(select(func.count(DailyMetric.id))) == 7
        assert session.scalar(select(func.count(SleepSession.id))) == 7
        metric_dates = list(session.scalars(select(DailyMetric.metric_date).order_by(DailyMetric.metric_date)))
        assert metric_dates[0] == FIXTURE_TODAY - timedelta(days=6)
    finally:
        session.close()
