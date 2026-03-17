from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db_session
from app.main import app
from app.models import Base, DailyMetric


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


def test_list_daily_metrics_sorts_desc_and_paginates() -> None:
    TestSession = _build_test_session_factory()
    session = TestSession()
    try:
        session.add_all(
            [
                DailyMetric(metric_date=date(2026, 3, 15), steps=5000, resting_heart_rate=52),
                DailyMetric(metric_date=date(2026, 3, 16), steps=7000, resting_heart_rate=51),
                DailyMetric(metric_date=date(2026, 3, 17), steps=9000, resting_heart_rate=50),
            ]
        )
        session.commit()
    finally:
        session.close()

    with _test_client(TestSession) as client:
        response = client.get("/api/v1/metrics/daily", params={"page": 1, "page_size": 2})
        payload = response.json()

        assert response.status_code == 200
        assert payload["total"] == 3
        assert payload["page"] == 1
        assert payload["page_size"] == 2
        assert [item["metric_date"] for item in payload["items"]] == [
            "2026-03-17",
            "2026-03-16",
        ]


def test_list_daily_metrics_filters_by_date_range() -> None:
    TestSession = _build_test_session_factory()
    session = TestSession()
    try:
        session.add_all(
            [
                DailyMetric(metric_date=date(2026, 3, 10), steps=4000),
                DailyMetric(metric_date=date(2026, 3, 17), steps=8000),
                DailyMetric(metric_date=date(2026, 3, 18), steps=8500),
            ]
        )
        session.commit()
    finally:
        session.close()

    with _test_client(TestSession) as client:
        response = client.get(
            "/api/v1/metrics/daily",
            params={"start_date": "2026-03-17", "end_date": "2026-03-18"},
        )
        payload = response.json()

        assert response.status_code == 200
        assert payload["total"] == 2
        assert [item["metric_date"] for item in payload["items"]] == [
            "2026-03-18",
            "2026-03-17",
        ]
