from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timezone

from sqlalchemy import Select, desc, func, select
from sqlalchemy.orm import Session

from app.models import Activity, ActivityLap, ActivityRecord


@dataclass(frozen=True)
class ActivityListFilters:
    page: int = 1
    page_size: int = 20
    start_date: date | None = None
    end_date: date | None = None
    sport: str | None = None


@dataclass(frozen=True)
class ActivityListResult:
    items: list[Activity]
    total: int
    page: int
    page_size: int


@dataclass(frozen=True)
class ActivityDetailResult:
    activity: Activity
    laps: list[ActivityLap]
    records: list[ActivityRecord]


class ActivityQueryService:
    """Read-only activity queries used by the API layer."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_activities(self, filters: ActivityListFilters) -> ActivityListResult:
        filtered_query = self._build_filtered_query(filters)
        total = self._session.scalar(
            select(func.count()).select_from(filtered_query.subquery())
        ) or 0

        items = list(
            self._session.scalars(
                filtered_query
                .order_by(desc(Activity.start_time), desc(Activity.id))
                .offset((filters.page - 1) * filters.page_size)
                .limit(filters.page_size)
            )
        )

        return ActivityListResult(
            items=items,
            total=total,
            page=filters.page,
            page_size=filters.page_size,
        )

    def get_activity_detail(self, activity_id: int) -> ActivityDetailResult | None:
        activity = self._session.get(Activity, activity_id)
        if activity is None:
            return None

        laps = list(
            self._session.scalars(
                select(ActivityLap)
                .where(ActivityLap.activity_id == activity_id)
                .order_by(ActivityLap.lap_index.asc(), ActivityLap.id.asc())
            )
        )
        records = list(
            self._session.scalars(
                select(ActivityRecord)
                .where(ActivityRecord.activity_id == activity_id)
                .order_by(ActivityRecord.record_time.asc(), ActivityRecord.id.asc())
            )
        )
        return ActivityDetailResult(
            activity=activity,
            laps=laps,
            records=records,
        )

    def _build_filtered_query(self, filters: ActivityListFilters) -> Select[tuple[Activity]]:
        query = select(Activity)

        if filters.start_date is not None:
            query = query.where(Activity.start_time >= self._at_utc_start(filters.start_date))

        if filters.end_date is not None:
            query = query.where(Activity.start_time <= self._at_utc_end(filters.end_date))

        if filters.sport:
            query = query.where(Activity.sport == filters.sport.strip().lower())

        return query

    def _at_utc_start(self, value: date) -> datetime:
        return datetime.combine(value, time.min, tzinfo=timezone.utc)

    def _at_utc_end(self, value: date) -> datetime:
        return datetime.combine(value, time.max, tzinfo=timezone.utc)
