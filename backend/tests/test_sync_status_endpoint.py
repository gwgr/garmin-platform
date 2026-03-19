from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db_session
from app.main import app
from app.models import Base, SyncCheckpoint


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


def test_sync_status_endpoint_returns_warning_when_no_sync_has_run() -> None:
    TestSession = _build_test_session_factory()

    with _test_client(TestSession) as client:
        response = client.get("/api/v1/sync/status")
        payload = response.json()

        assert response.status_code == 200
        assert payload["state"] == "warning"
        assert payload["is_stale"] is True
        assert payload["last_attempted_at"] is None


def test_sync_status_endpoint_returns_error_for_recent_failed_sync() -> None:
    TestSession = _build_test_session_factory()
    session = TestSession()
    try:
        session.add(
            SyncCheckpoint(
                sync_key="garmin_activities",
                last_attempted_at=datetime.now(timezone.utc),
                last_succeeded_at=datetime.now(timezone.utc) - timedelta(hours=1),
                last_run_status="error",
                consecutive_failures=2,
                last_error_summary="Garmin returned HTTP 429.",
            )
        )
        session.commit()
    finally:
        session.close()

    with _test_client(TestSession) as client:
        response = client.get("/api/v1/sync/status")
        payload = response.json()

        assert response.status_code == 200
        assert payload["state"] == "error"
        assert payload["summary"] == "Garmin returned HTTP 429."
        assert payload["consecutive_failures"] == 2
