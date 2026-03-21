from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base, SyncCheckpoint
from app.services.garmin import GarthGarminClient
from app.services.garmin_activity_fetcher import GARMIN_ACTIVITY_SYNC_KEY, GarminActivityFetcher
from app.services.sync_checkpoint import SyncCheckpointService


def _build_test_session() -> Session:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    return TestSession()


def test_garth_garmin_client_list_activities_accepts_start_offset(monkeypatch) -> None:
    captured_params: dict[str, str | int] = {}

    class _FakeGarth:
        def connectapi(self, path, params):
            assert path == "/activitylist-service/activities/search/activities"
            captured_params.update(params)
            return []

    client = GarthGarminClient(
        email=None,
        password=None,
        garth_home=Path("data/garth"),
        retry_delays_seconds=(1, 2, 3),
    )
    monkeypatch.setattr(client, "_login", lambda: _FakeGarth())

    client.list_activities(
        since=datetime(2026, 3, 21, 8, 27, 2, tzinfo=timezone.utc),
        limit=25,
        start=50,
    )

    assert captured_params == {
        "start": 50,
        "limit": 25,
        "startDate": "2026-03-21",
    }


def test_garmin_activity_fetcher_uses_backfill_offset_when_present() -> None:
    session = _build_test_session()
    session.add(
        SyncCheckpoint(
            sync_key=GARMIN_ACTIVITY_SYNC_KEY,
            last_synced_at=datetime(2026, 3, 21, 8, 27, 2, tzinfo=timezone.utc),
            last_source_id="recent-1",
            backfill_offset=75,
        )
    )
    session.commit()

    class _FakeClient:
        def __init__(self) -> None:
            self.calls: list[tuple[datetime | None, int, int]] = []

        def list_activities(self, since=None, limit=100, start=0):
            self.calls.append((since, limit, start))
            return []

    client = _FakeClient()
    result = GarminActivityFetcher(
        client,
        SyncCheckpointService(session),
        limit=25,
    ).fetch_activities()

    assert client.calls == [(None, 25, 75)]
    assert result.is_backfill is True
    assert result.start == 75
    session.close()


def test_garmin_activity_fetcher_uses_incremental_since_when_not_backfilling() -> None:
    session = _build_test_session()
    last_synced_at = datetime(2026, 3, 21, 8, 27, 2, tzinfo=timezone.utc)
    session.add(
        SyncCheckpoint(
            sync_key=GARMIN_ACTIVITY_SYNC_KEY,
            last_synced_at=last_synced_at,
            last_source_id="recent-1",
        )
    )
    session.commit()

    class _FakeClient:
        def __init__(self) -> None:
            self.calls: list[tuple[datetime | None, int, int]] = []

        def list_activities(self, since=None, limit=100, start=0):
            self.calls.append((since, limit, start))
            return []

    client = _FakeClient()
    result = GarminActivityFetcher(
        client,
        SyncCheckpointService(session),
        limit=25,
    ).fetch_activities()

    assert len(client.calls) == 1
    assert client.calls[0][0] is not None
    assert client.calls[0][0].isoformat() == "2026-03-21T08:27:02"
    assert client.calls[0][1:] == (25, 0)
    assert result.is_backfill is False
    assert result.start == 0
    session.close()
