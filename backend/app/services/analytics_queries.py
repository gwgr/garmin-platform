from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Activity, DailyMetric


@dataclass(frozen=True)
class TrendWindowSummary:
    label: str
    start_date: date
    end_date: date
    activity_count: int
    total_distance_meters: float
    total_duration_seconds: float
    sport_rollups: list["SportRollupSummary"]


@dataclass(frozen=True)
class SportRollupSummary:
    sport: str
    activity_count: int
    total_distance_meters: float
    total_duration_seconds: float


@dataclass(frozen=True)
class RecentActivityCounts:
    last_7_days: int
    last_30_days: int
    last_90_days: int


@dataclass(frozen=True)
class RestingHeartRatePoint:
    metric_date: date
    resting_heart_rate: int


@dataclass(frozen=True)
class ActivityTrendsResult:
    current_week: TrendWindowSummary
    last_30_days: TrendWindowSummary
    last_6_months: TrendWindowSummary
    last_1_year: TrendWindowSummary
    recent_activity_counts: RecentActivityCounts
    resting_heart_rate_trend: list[RestingHeartRatePoint]


class AnalyticsQueryService:
    """Read-only analytics queries used by the API layer."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_activity_trends(self, today: date | None = None) -> ActivityTrendsResult:
        today = today or datetime.now(timezone.utc).date()

        week_start = today - timedelta(days=today.weekday())
        last_30_days_start = today - timedelta(days=29)
        six_month_start = today - timedelta(days=182)
        year_start = today - timedelta(days=365)

        return ActivityTrendsResult(
            current_week=self._summarize_window("current_week", week_start, today),
            last_30_days=self._summarize_window("last_30_days", last_30_days_start, today),
            last_6_months=self._summarize_window("last_6_months", six_month_start, today),
            last_1_year=self._summarize_window("last_1_year", year_start, today),
            recent_activity_counts=RecentActivityCounts(
                last_7_days=self._count_activities(today - timedelta(days=6), today),
                last_30_days=self._count_activities(today - timedelta(days=29), today),
                last_90_days=self._count_activities(today - timedelta(days=89), today),
            ),
            resting_heart_rate_trend=self._get_resting_heart_rate_trend(limit=30),
        )

    def _summarize_window(self, label: str, start_date: date, end_date: date) -> TrendWindowSummary:
        start_at = self._at_utc_start(start_date)
        end_at = self._at_utc_end(end_date)

        activity_count, total_distance, total_duration = self._session.execute(
            select(
                func.count(Activity.id),
                func.coalesce(func.sum(Activity.distance_meters), 0.0),
                func.coalesce(func.sum(Activity.duration_seconds), 0.0),
            ).where(
                Activity.start_time >= start_at,
                Activity.start_time <= end_at,
            )
        ).one()

        return TrendWindowSummary(
            label=label,
            start_date=start_date,
            end_date=end_date,
            activity_count=int(activity_count or 0),
            total_distance_meters=float(total_distance or 0.0),
            total_duration_seconds=float(total_duration or 0.0),
            sport_rollups=self._summarize_window_by_sport(start_at, end_at),
        )

    def _summarize_window_by_sport(
        self,
        start_at: datetime,
        end_at: datetime,
    ) -> list[SportRollupSummary]:
        rows = self._session.execute(
            select(
                Activity.sport,
                func.count(Activity.id),
                func.coalesce(func.sum(Activity.distance_meters), 0.0),
                func.coalesce(func.sum(Activity.duration_seconds), 0.0),
            )
            .where(
                Activity.start_time >= start_at,
                Activity.start_time <= end_at,
            )
            .group_by(Activity.sport)
        ).all()

        summaries = [
            SportRollupSummary(
                sport=(sport or "unknown").strip() or "unknown",
                activity_count=int(activity_count or 0),
                total_distance_meters=float(total_distance or 0.0),
                total_duration_seconds=float(total_duration or 0.0),
            )
            for sport, activity_count, total_distance, total_duration in rows
        ]

        return sorted(
            summaries,
            key=lambda summary: (
                -summary.activity_count,
                -summary.total_distance_meters,
                -summary.total_duration_seconds,
                summary.sport,
            ),
        )

    def _count_activities(self, start_date: date, end_date: date) -> int:
        start_at = self._at_utc_start(start_date)
        end_at = self._at_utc_end(end_date)
        count = self._session.scalar(
            select(func.count(Activity.id)).where(
                Activity.start_time >= start_at,
                Activity.start_time <= end_at,
            )
        )
        return int(count or 0)

    def _get_resting_heart_rate_trend(self, limit: int) -> list[RestingHeartRatePoint]:
        metrics = list(
            self._session.scalars(
                select(DailyMetric)
                .where(DailyMetric.resting_heart_rate.is_not(None))
                .order_by(DailyMetric.metric_date.desc(), DailyMetric.id.desc())
                .limit(limit)
            )
        )
        metrics.reverse()
        return [
            RestingHeartRatePoint(
                metric_date=metric.metric_date,
                resting_heart_rate=int(metric.resting_heart_rate),
            )
            for metric in metrics
            if metric.resting_heart_rate is not None
        ]

    def _at_utc_start(self, value: date) -> datetime:
        return datetime.combine(value, time.min, tzinfo=timezone.utc)

    def _at_utc_end(self, value: date) -> datetime:
        return datetime.combine(value, time.max, tzinfo=timezone.utc)
