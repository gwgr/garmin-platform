from __future__ import annotations

from collections.abc import Generator
from datetime import datetime, timezone

from contextlib import contextmanager

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db_session
from app.main import app
from app.models import Activity, ActivityLap, ActivityRecord, Base


def _seed_activity(
    session: Session,
    *,
    source_activity_id: str,
    sport: str,
    start_time: datetime,
    distance_meters: float,
) -> Activity:
    activity = Activity(
        source_activity_id=source_activity_id,
        name=f"{sport.title()} Session",
        sport=sport,
        start_time=start_time,
        distance_meters=distance_meters,
    )
    session.add(activity)
    session.flush()
    return activity


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


def test_list_activities_sorts_desc_and_paginates() -> None:
    TestSession = _build_test_session_factory()
    session = TestSession()
    try:
        _seed_activity(
            session,
            source_activity_id="activity-1",
            sport="running",
            start_time=datetime(2026, 3, 15, 6, 0, tzinfo=timezone.utc),
            distance_meters=5000,
        )
        _seed_activity(
            session,
            source_activity_id="activity-2",
            sport="walking",
            start_time=datetime(2026, 3, 16, 6, 0, tzinfo=timezone.utc),
            distance_meters=3000,
        )
        latest_activity = _seed_activity(
            session,
            source_activity_id="activity-3",
            sport="running",
            start_time=datetime(2026, 3, 17, 6, 0, tzinfo=timezone.utc),
            distance_meters=7000,
        )
        session.add_all(
            [
                ActivityRecord(
                    activity_id=latest_activity.id,
                    record_time=datetime(2026, 3, 17, 6, 0, tzinfo=timezone.utc),
                    heart_rate=140,
                ),
                ActivityRecord(
                    activity_id=latest_activity.id,
                    record_time=datetime(2026, 3, 17, 6, 1, tzinfo=timezone.utc),
                    heart_rate=150,
                ),
            ]
        )
        session.commit()
    finally:
        session.close()

    with _test_client(TestSession) as client:
        response = client.get("/api/v1/activities", params={"page": 1, "page_size": 2})
        payload = response.json()

        assert response.status_code == 200
        assert payload["total"] == 3
        assert payload["page"] == 1
        assert payload["page_size"] == 2
        assert [item["source_activity_id"] for item in payload["items"]] == [
            "activity-3",
            "activity-2",
        ]
        assert payload["items"][0]["average_heart_rate"] == 145.0
        assert payload["items"][1]["average_heart_rate"] is None


def test_list_activities_filters_by_date_and_sport() -> None:
    TestSession = _build_test_session_factory()
    session = TestSession()
    try:
        _seed_activity(
            session,
            source_activity_id="run-in-range",
            sport="running",
            start_time=datetime(2026, 3, 17, 6, 0, tzinfo=timezone.utc),
            distance_meters=6000,
        )
        _seed_activity(
            session,
            source_activity_id="walk-in-range",
            sport="walking",
            start_time=datetime(2026, 3, 17, 7, 0, tzinfo=timezone.utc),
            distance_meters=2500,
        )
        _seed_activity(
            session,
            source_activity_id="run-out-of-range",
            sport="running",
            start_time=datetime(2026, 3, 10, 6, 0, tzinfo=timezone.utc),
            distance_meters=8000,
        )
        session.commit()
    finally:
        session.close()

    with _test_client(TestSession) as client:
        response = client.get(
            "/api/v1/activities",
            params={
                "start_date": "2026-03-16",
                "end_date": "2026-03-17",
                "sport": "running",
            },
        )
        payload = response.json()

        assert response.status_code == 200
        assert payload["total"] == 1
        assert [item["source_activity_id"] for item in payload["items"]] == ["run-in-range"]


def test_get_activity_detail_returns_summary_laps_and_records() -> None:
    TestSession = _build_test_session_factory()
    session = TestSession()
    try:
        activity = Activity(
            source_activity_id="detail-1",
            name="Walk Detail",
            sport="walking",
            start_time=datetime(2026, 3, 17, 6, 0, tzinfo=timezone.utc),
            distance_meters=3301.6,
            duration_seconds=2899.633,
            calories=194,
            raw_file_path="data/raw/activities/2026/03/detail-1.fit",
        )
        session.add(activity)
        session.flush()
        session.add_all(
            [
                ActivityLap(
                    activity_id=activity.id,
                    lap_index=1,
                    start_time=datetime(2026, 3, 17, 6, 0, tzinfo=timezone.utc),
                    distance_meters=1000,
                    duration_seconds=771.881,
                    average_heart_rate=64,
                    max_heart_rate=83,
                    calories=50,
                ),
                ActivityLap(
                    activity_id=activity.id,
                    lap_index=2,
                    start_time=datetime(2026, 3, 17, 6, 12, tzinfo=timezone.utc),
                    distance_meters=1000,
                    duration_seconds=788.352,
                    average_heart_rate=72,
                    max_heart_rate=90,
                    calories=55,
                ),
                ActivityRecord(
                    activity_id=activity.id,
                    record_time=datetime(2026, 3, 17, 6, 0, tzinfo=timezone.utc),
                    elapsed_seconds=0,
                    distance_meters=0,
                    heart_rate=60,
                    speed_mps=1.2,
                ),
                ActivityRecord(
                    activity_id=activity.id,
                    record_time=datetime(2026, 3, 17, 6, 1, tzinfo=timezone.utc),
                    elapsed_seconds=60,
                    distance_meters=80,
                    heart_rate=62,
                    speed_mps=1.3,
                ),
            ]
        )
        session.commit()
        activity_id = activity.id
    finally:
        session.close()

    with _test_client(TestSession) as client:
        response = client.get(f"/api/v1/activities/{activity_id}")
        payload = response.json()

        assert response.status_code == 200
        assert payload["activity"]["source_activity_id"] == "detail-1"
        assert payload["activity"]["sport"] == "walking"
        assert payload["activity"]["start_time"] == "2026-03-17T06:00:00Z"
        assert [lap["lap_index"] for lap in payload["laps"]] == [1, 2]
        assert payload["laps"][0]["start_time"] == "2026-03-17T06:00:00Z"
        assert len(payload["records"]) == 2
        assert payload["records"][0]["record_time"] == "2026-03-17T06:00:00Z"


def test_get_activity_detail_returns_404_for_missing_activity() -> None:
    TestSession = _build_test_session_factory()

    with _test_client(TestSession) as client:
        response = client.get("/api/v1/activities/999")

        assert response.status_code == 404
        assert response.json() == {"detail": "Activity not found."}
