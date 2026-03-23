from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Activity, Base, DailyMetric
from app.services.analytics_queries import AnalyticsQueryService


def _build_test_session() -> Session:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    return TestSession()


def test_get_activity_trends_returns_zeroed_summaries_for_empty_data() -> None:
    session = _build_test_session()
    try:
        result = AnalyticsQueryService(session).get_activity_trends(today=date(2026, 3, 17))

        assert result.current_week.activity_count == 0
        assert result.current_week.total_distance_meters == 0.0
        assert result.current_month.total_duration_seconds == 0.0
        assert result.last_6_months.activity_count == 0
        assert result.last_1_year.activity_count == 0
        assert result.recent_activity_counts.last_7_days == 0
        assert result.recent_activity_counts.last_30_days == 0
        assert result.recent_activity_counts.last_90_days == 0
        assert result.resting_heart_rate_trend == []
    finally:
        session.close()


def test_get_activity_trends_limits_resting_heart_rate_points_to_latest_30_in_ascending_order() -> None:
    today = date(2026, 3, 17)
    session = _build_test_session()
    try:
        session.add(
            Activity(
                source_activity_id="recent-run",
                name="Recent Run",
                sport="running",
                start_time=datetime.combine(today - timedelta(days=1), time(6, 0), tzinfo=timezone.utc),
                distance_meters=5000,
                duration_seconds=1500,
            )
        )
        session.add_all(
            [
                DailyMetric(
                    metric_date=today - timedelta(days=offset),
                    resting_heart_rate=40 + offset,
                )
                for offset in range(35)
            ]
        )
        session.commit()

        result = AnalyticsQueryService(session).get_activity_trends(today=today)

        assert result.recent_activity_counts.last_7_days == 1
        assert len(result.resting_heart_rate_trend) == 30
        assert result.resting_heart_rate_trend[0].metric_date == date(2026, 2, 16)
        assert result.resting_heart_rate_trend[-1].metric_date == date(2026, 3, 17)
        assert result.resting_heart_rate_trend[0].resting_heart_rate == 69
        assert result.resting_heart_rate_trend[-1].resting_heart_rate == 40
    finally:
        session.close()


def test_get_activity_trends_includes_full_window_sport_rollups() -> None:
    today = date(2026, 3, 17)
    session = _build_test_session()
    try:
        session.add_all(
            [
                Activity(
                    source_activity_id="run-1",
                    name="Run One",
                    sport="running",
                    start_time=datetime.combine(today - timedelta(days=120), time(6, 0), tzinfo=timezone.utc),
                    distance_meters=10000,
                    duration_seconds=3600,
                ),
                Activity(
                    source_activity_id="run-2",
                    name="Run Two",
                    sport="running",
                    start_time=datetime.combine(today - timedelta(days=60), time(6, 0), tzinfo=timezone.utc),
                    distance_meters=5000,
                    duration_seconds=1800,
                ),
                Activity(
                    source_activity_id="walk-1",
                    name="Walk One",
                    sport="walking",
                    start_time=datetime.combine(today - timedelta(days=20), time(6, 0), tzinfo=timezone.utc),
                    distance_meters=3000,
                    duration_seconds=2400,
                ),
                Activity(
                    source_activity_id="bike-1",
                    name="Bike One",
                    sport="cycling",
                    start_time=datetime.combine(today - timedelta(days=10), time(6, 0), tzinfo=timezone.utc),
                    distance_meters=25000,
                    duration_seconds=3900,
                ),
            ]
        )
        session.commit()

        result = AnalyticsQueryService(session).get_activity_trends(today=today)

        assert result.last_6_months.activity_count == 4
        assert [rollup.sport for rollup in result.last_6_months.sport_rollups] == [
            "running",
            "cycling",
            "walking",
        ]
        assert result.last_6_months.sport_rollups[0].activity_count == 2
        assert result.last_6_months.sport_rollups[0].total_distance_meters == 15000.0
        assert result.last_6_months.sport_rollups[0].total_duration_seconds == 5400.0
    finally:
        session.close()
