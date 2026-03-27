from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from datetime import date, datetime, time, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db_session
from app.main import app
from app.models import Activity, Base, DailyMetric
from app.services.analytics_queries import AnalyticsQueryService


def _build_test_session_factory() -> sessionmaker[Session]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    return TestSession


@contextmanager
def _test_client(TestSession: sessionmaker[Session]) -> Generator[TestClient, None, None]:
    def override_get_db_session() -> Generator[Session, None, None]:
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db_session] = override_get_db_session
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


def test_get_analytics_trends_returns_expected_summaries() -> None:
    today = datetime.now(timezone.utc).date()
    week_activity_date = today
    month_activity_date = today.replace(day=5)
    year_activity_date = date(2025, 12, 1)

    TestSession = _build_test_session_factory()
    session = TestSession()
    try:
        session.add_all(
            [
                Activity(
                    source_activity_id="year-1",
                    name="Old Run",
                    sport="running",
                    start_time=datetime.combine(year_activity_date, time(6, 0), tzinfo=timezone.utc),
                    distance_meters=10000,
                    duration_seconds=3600,
                ),
                Activity(
                    source_activity_id="month-1",
                    name="March Walk",
                    sport="walking",
                    start_time=datetime.combine(month_activity_date, time(6, 0), tzinfo=timezone.utc),
                    distance_meters=3000,
                    duration_seconds=1800,
                ),
                Activity(
                    source_activity_id="week-1",
                    name="Recent Walk",
                    sport="walking",
                    start_time=datetime.combine(week_activity_date, time(6, 0), tzinfo=timezone.utc),
                    distance_meters=3300,
                    duration_seconds=2900,
                ),
            ]
        )
        session.add_all(
            [
                DailyMetric(metric_date=today - timedelta(days=2), resting_heart_rate=52),
                DailyMetric(metric_date=today - timedelta(days=1), resting_heart_rate=51),
                DailyMetric(metric_date=today, resting_heart_rate=50),
            ]
        )
        session.commit()
    finally:
        session.close()

    session = TestSession()
    try:
        result = AnalyticsQueryService(session).get_activity_trends(today=today)
        assert result.current_week.activity_count == 1
        assert result.last_30_days.activity_count == 2
        assert result.last_6_months.activity_count == 3
        assert result.last_1_year.activity_count == 3
        assert result.recent_activity_counts.last_7_days == 1
        assert [point.resting_heart_rate for point in result.resting_heart_rate_trend] == [52, 51, 50]
    finally:
        session.close()

    with _test_client(TestSession) as client:
        response = client.get("/api/v1/analytics/trends")
        payload = response.json()

        assert response.status_code == 200
        assert payload["current_week"]["activity_count"] == 1
        assert payload["last_30_days"]["activity_count"] == 2
        assert payload["last_6_months"]["sport_rollups"][0]["sport"] == "walking"
        assert payload["last_6_months"]["sport_rollups"][0]["activity_count"] == 2
        assert payload["last_6_months"]["sport_rollups"][1]["sport"] == "running"
        assert "resting_heart_rate_trend" in payload
