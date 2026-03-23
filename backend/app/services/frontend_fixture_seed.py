from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, sessionmaker

from app.models import Activity, ActivityLap, ActivityRecord, DailyMetric, SleepSession, SyncCheckpoint


FIXTURE_PREFIX = "fixture-"
FIXTURE_TODAY = date(2026, 3, 23)
SYNC_KEY = "garmin_activities"


@dataclass(frozen=True)
class SeedFrontendFixtureResult:
    activity_count: int
    lap_count: int
    record_count: int
    daily_metric_count: int
    sleep_session_count: int


@dataclass(frozen=True)
class FixtureActivityDefinition:
    source_activity_id: str
    name: str
    sport: str
    start_time: datetime
    distance_meters: float
    duration_seconds: float
    calories: int
    route_start_latitude: float | None = None
    route_start_longitude: float | None = None


def _dt(days_offset: int, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(
        FIXTURE_TODAY + timedelta(days=days_offset),
        time(hour, minute),
        tzinfo=timezone.utc,
    )


FIXTURE_ACTIVITIES: tuple[FixtureActivityDefinition, ...] = (
    FixtureActivityDefinition(
        source_activity_id="fixture-run-001",
        name="Easy Morning Run",
        sport="running",
        start_time=_dt(-2, 6, 30),
        distance_meters=8200,
        duration_seconds=2740,
        calories=540,
        route_start_latitude=-37.8136,
        route_start_longitude=144.9631,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-walk-001",
        name="Recovery Walk",
        sport="walking",
        start_time=_dt(-1, 8, 10),
        distance_meters=3800,
        duration_seconds=2880,
        calories=220,
        route_start_latitude=-37.815,
        route_start_longitude=144.971,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-cycle-001",
        name="Tempo Ride",
        sport="cycling",
        start_time=_dt(-5, 5, 45),
        distance_meters=32400,
        duration_seconds=4200,
        calories=760,
        route_start_latitude=-37.82,
        route_start_longitude=144.98,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-run-002",
        name="Long Run",
        sport="running",
        start_time=_dt(-9, 6, 15),
        distance_meters=16200,
        duration_seconds=5820,
        calories=980,
        route_start_latitude=-37.83,
        route_start_longitude=144.95,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-strength-001",
        name="Strength Session",
        sport="strength_training",
        start_time=_dt(-12, 17, 30),
        distance_meters=0,
        duration_seconds=2700,
        calories=410,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-run-003",
        name="Intervals",
        sport="running",
        start_time=_dt(-24, 6, 20),
        distance_meters=9600,
        duration_seconds=3180,
        calories=640,
        route_start_latitude=-37.81,
        route_start_longitude=144.99,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-cycle-002",
        name="Weekend Ride",
        sport="cycling",
        start_time=_dt(-38, 7, 5),
        distance_meters=48700,
        duration_seconds=7200,
        calories=1220,
        route_start_latitude=-37.79,
        route_start_longitude=144.94,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-walk-002",
        name="City Walk",
        sport="walking",
        start_time=_dt(-54, 9, 0),
        distance_meters=6100,
        duration_seconds=4200,
        calories=310,
        route_start_latitude=-37.805,
        route_start_longitude=144.965,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-run-004",
        name="Threshold Run",
        sport="running",
        start_time=_dt(-92, 6, 10),
        distance_meters=12800,
        duration_seconds=4320,
        calories=810,
        route_start_latitude=-37.821,
        route_start_longitude=144.952,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-hike-001",
        name="Weekend Hike",
        sport="hiking",
        start_time=_dt(-140, 8, 30),
        distance_meters=14100,
        duration_seconds=9300,
        calories=1010,
        route_start_latitude=-37.9,
        route_start_longitude=145.15,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-cycle-003",
        name="Base Ride",
        sport="cycling",
        start_time=_dt(-188, 6, 40),
        distance_meters=55200,
        duration_seconds=8100,
        calories=1340,
        route_start_latitude=-37.78,
        route_start_longitude=144.9,
    ),
    FixtureActivityDefinition(
        source_activity_id="fixture-run-005",
        name="Progression Run",
        sport="running",
        start_time=_dt(-301, 6, 25),
        distance_meters=11300,
        duration_seconds=3960,
        calories=740,
        route_start_latitude=-37.84,
        route_start_longitude=144.97,
    ),
)


class FrontendFixtureSeedService:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def seed(self) -> SeedFrontendFixtureResult:
        session = self._session_factory()
        try:
            self._delete_existing_fixture_data(session)
            result = self._insert_fixture_data(session)
            session.commit()
            return result
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def _delete_existing_fixture_data(self, session: Session) -> None:
        fixture_activity_ids = list(
            session.scalars(
                select(Activity.id).where(Activity.source_activity_id.like(f"{FIXTURE_PREFIX}%"))
            )
        )

        if fixture_activity_ids:
            session.execute(delete(ActivityRecord).where(ActivityRecord.activity_id.in_(fixture_activity_ids)))
            session.execute(delete(ActivityLap).where(ActivityLap.activity_id.in_(fixture_activity_ids)))
            session.execute(delete(Activity).where(Activity.id.in_(fixture_activity_ids)))

        session.execute(
            delete(DailyMetric).where(
                DailyMetric.metric_date >= FIXTURE_TODAY - timedelta(days=13),
                DailyMetric.metric_date <= FIXTURE_TODAY,
            )
        )
        session.execute(
            delete(SleepSession).where(SleepSession.source_sleep_id.like(f"{FIXTURE_PREFIX}%"))
        )

    def _insert_fixture_data(self, session: Session) -> SeedFrontendFixtureResult:
        lap_count = 0
        record_count = 0

        for definition in FIXTURE_ACTIVITIES:
            activity = Activity(
                source_activity_id=definition.source_activity_id,
                name=definition.name,
                sport=definition.sport,
                start_time=definition.start_time,
                distance_meters=definition.distance_meters,
                duration_seconds=definition.duration_seconds,
                calories=definition.calories,
                raw_file_path=f"fixtures/{definition.source_activity_id}.fit",
            )
            session.add(activity)
            session.flush()

            if definition.distance_meters > 0:
                lap_count += self._create_activity_laps(session, activity, definition)
                record_count += self._create_activity_records(session, activity, definition)

        metric_count = self._create_daily_metrics(session)
        sleep_count = self._create_sleep_sessions(session)
        self._upsert_sync_checkpoint(session)

        return SeedFrontendFixtureResult(
            activity_count=len(FIXTURE_ACTIVITIES),
            lap_count=lap_count,
            record_count=record_count,
            daily_metric_count=metric_count,
            sleep_session_count=sleep_count,
        )

    def _create_activity_laps(
        self,
        session: Session,
        activity: Activity,
        definition: FixtureActivityDefinition,
    ) -> int:
        lap_total = 3 if definition.distance_meters >= 9000 else 2
        lap_distance = definition.distance_meters / lap_total if lap_total else 0
        lap_duration = definition.duration_seconds / lap_total if lap_total else 0

        for lap_index in range(1, lap_total + 1):
            lap = ActivityLap(
                activity_id=activity.id,
                lap_index=lap_index,
                start_time=definition.start_time + timedelta(seconds=lap_duration * (lap_index - 1)),
                distance_meters=lap_distance,
                duration_seconds=lap_duration,
                average_heart_rate=128 + lap_index * 4 if definition.sport == "running" else 118 + lap_index * 3,
                max_heart_rate=140 + lap_index * 5 if definition.sport == "running" else 132 + lap_index * 4,
                calories=int(definition.calories / lap_total),
            )
            session.add(lap)

        return lap_total

    def _create_activity_records(
        self,
        session: Session,
        activity: Activity,
        definition: FixtureActivityDefinition,
    ) -> int:
        if definition.route_start_latitude is None or definition.route_start_longitude is None:
            return 0

        record_total = 12
        for index in range(record_total):
            progress = index / max(record_total - 1, 1)
            session.add(
                ActivityRecord(
                    activity_id=activity.id,
                    record_time=definition.start_time + timedelta(seconds=definition.duration_seconds * progress),
                    elapsed_seconds=definition.duration_seconds * progress,
                    distance_meters=definition.distance_meters * progress,
                    latitude_degrees=definition.route_start_latitude + (0.01 * progress),
                    longitude_degrees=definition.route_start_longitude + (0.01 * progress),
                    altitude_meters=22 + (index * 1.5),
                    heart_rate=118 + index if definition.sport == "cycling" else 126 + index,
                    cadence=82 + index if definition.sport == "cycling" else 164 + index,
                    speed_mps=(definition.distance_meters / definition.duration_seconds) if definition.duration_seconds else None,
                    power_watts=190 + index * 5 if definition.sport == "cycling" else None,
                    temperature_celsius=18 + (index * 0.2),
                )
            )

        return record_total

    def _create_daily_metrics(self, session: Session) -> int:
        definitions = [
            (-6, 50, 82, 28, 9200, 8, 2440, 27600),
            (-5, 49, 79, 31, 8700, 7, 2360, 27000),
            (-4, 50, 76, 33, 10100, 9, 2550, 28200),
            (-3, 52, 71, 39, 6400, 5, 2180, 25000),
            (-2, 51, 74, 35, 11500, 10, 2630, 28600),
            (-1, 50, 77, 32, 9800, 8, 2480, 27900),
            (0, 49, 81, 27, 7600, 6, 2300, 28800),
        ]

        for offset, resting_hr, body_battery, stress, steps, floors, calories, sleep_seconds in definitions:
            session.add(
                DailyMetric(
                    metric_date=FIXTURE_TODAY + timedelta(days=offset),
                    resting_heart_rate=resting_hr,
                    body_battery=body_battery,
                    stress_score=stress,
                    steps=steps,
                    floors_climbed=floors,
                    calories_burned=calories,
                    sleep_seconds=sleep_seconds,
                )
            )

        return len(definitions)

    def _create_sleep_sessions(self, session: Session) -> int:
        definitions = [
            ("fixture-sleep-001", _dt(-6, 21, 45), _dt(-5, 5, 25), 27600, 5000, 14300, 6000, 2300, 79),
            ("fixture-sleep-002", _dt(-5, 22, 5), _dt(-4, 5, 35), 27000, 4700, 14100, 5900, 2300, 77),
            ("fixture-sleep-003", _dt(-4, 21, 35), _dt(-3, 5, 25), 28200, 5200, 14700, 6200, 2100, 83),
            ("fixture-sleep-004", _dt(-3, 22, 20), _dt(-2, 5, 16), 25000, 4100, 13200, 5400, 2300, 72),
            ("fixture-sleep-005", _dt(-2, 21, 55), _dt(-1, 5, 52), 28600, 5400, 14800, 6100, 2300, 84),
            ("fixture-sleep-006", _dt(-1, 22, 8), _dt(0, 5, 53), 27900, 5100, 14500, 5900, 2400, 80),
            ("fixture-sleep-007", _dt(0, 21, 50), _dt(1, 5, 50), 28800, 5500, 14900, 6200, 2200, 85),
        ]

        for (
            source_sleep_id,
            sleep_start,
            sleep_end,
            duration_seconds,
            deep_sleep_seconds,
            light_sleep_seconds,
            rem_sleep_seconds,
            awake_seconds,
            sleep_score,
        ) in definitions:
            session.add(
                SleepSession(
                    source_sleep_id=source_sleep_id,
                    sleep_start=sleep_start,
                    sleep_end=sleep_end,
                    duration_seconds=duration_seconds,
                    deep_sleep_seconds=deep_sleep_seconds,
                    light_sleep_seconds=light_sleep_seconds,
                    rem_sleep_seconds=rem_sleep_seconds,
                    awake_seconds=awake_seconds,
                    sleep_score=sleep_score,
                )
            )

        return len(definitions)

    def _upsert_sync_checkpoint(self, session: Session) -> None:
        checkpoint = session.scalar(
            select(SyncCheckpoint).where(SyncCheckpoint.sync_key == SYNC_KEY)
        )

        latest_activity = max(FIXTURE_ACTIVITIES, key=lambda activity: activity.start_time)

        if checkpoint is None:
            checkpoint = SyncCheckpoint(sync_key=SYNC_KEY)
            session.add(checkpoint)

        checkpoint.last_synced_at = latest_activity.start_time
        checkpoint.last_source_id = latest_activity.source_activity_id
        checkpoint.backfill_offset = None
        checkpoint.last_attempted_at = FIXTURE_TODAY_AT_UTC
        checkpoint.last_succeeded_at = FIXTURE_TODAY_AT_UTC
        checkpoint.last_run_status = "success"
        checkpoint.consecutive_failures = 0
        checkpoint.last_error_summary = None


FIXTURE_TODAY_AT_UTC = datetime.combine(FIXTURE_TODAY, time(7, 0), tzinfo=timezone.utc)
