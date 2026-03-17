from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.services import AnalyticsQueryService, ActivityTrendsResult

router = APIRouter()


class TrendWindowSummaryResponse(BaseModel):
    label: str
    start_date: date
    end_date: date
    activity_count: int
    total_distance_meters: float
    total_duration_seconds: float


class RecentActivityCountsResponse(BaseModel):
    last_7_days: int
    last_30_days: int
    last_90_days: int


class RestingHeartRatePointResponse(BaseModel):
    metric_date: date
    resting_heart_rate: int


class ActivityTrendsResponse(BaseModel):
    current_week: TrendWindowSummaryResponse
    current_month: TrendWindowSummaryResponse
    last_6_months: TrendWindowSummaryResponse
    last_1_year: TrendWindowSummaryResponse
    recent_activity_counts: RecentActivityCountsResponse
    resting_heart_rate_trend: list[RestingHeartRatePointResponse]


def _map_window_summary(window) -> TrendWindowSummaryResponse:
    return TrendWindowSummaryResponse(
        label=window.label,
        start_date=window.start_date,
        end_date=window.end_date,
        activity_count=window.activity_count,
        total_distance_meters=window.total_distance_meters,
        total_duration_seconds=window.total_duration_seconds,
    )


@router.get("/analytics/trends", response_model=ActivityTrendsResponse, tags=["analytics"])
def get_activity_trends(
    session: Session = Depends(get_db_session),
) -> ActivityTrendsResponse:
    result: ActivityTrendsResult = AnalyticsQueryService(session).get_activity_trends()
    return ActivityTrendsResponse(
        current_week=_map_window_summary(result.current_week),
        current_month=_map_window_summary(result.current_month),
        last_6_months=_map_window_summary(result.last_6_months),
        last_1_year=_map_window_summary(result.last_1_year),
        recent_activity_counts=RecentActivityCountsResponse(
            last_7_days=result.recent_activity_counts.last_7_days,
            last_30_days=result.recent_activity_counts.last_30_days,
            last_90_days=result.recent_activity_counts.last_90_days,
        ),
        resting_heart_rate_trend=[
            RestingHeartRatePointResponse(
                metric_date=point.metric_date,
                resting_heart_rate=point.resting_heart_rate,
            )
            for point in result.resting_heart_rate_trend
        ],
    )
