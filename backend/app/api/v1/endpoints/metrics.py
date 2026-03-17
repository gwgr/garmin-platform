from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.models import DailyMetric
from app.services import DailyMetricListFilters, DailyMetricListResult, DailyMetricQueryService

router = APIRouter()


class DailyMetricItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    metric_date: date
    resting_heart_rate: int | None
    body_battery: int | None
    stress_score: int | None
    steps: int | None
    floors_climbed: int | None
    calories_burned: int | None
    sleep_seconds: int | None


class DailyMetricListResponse(BaseModel):
    items: list[DailyMetricItem]
    total: int
    page: int
    page_size: int


def _map_items(items: list[DailyMetric]) -> list[DailyMetricItem]:
    return [DailyMetricItem.model_validate(item) for item in items]


@router.get("/metrics/daily", response_model=DailyMetricListResponse, tags=["metrics"])
def list_daily_metrics(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=365),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    session: Session = Depends(get_db_session),
) -> DailyMetricListResponse:
    filters = DailyMetricListFilters(
        page=page,
        page_size=page_size,
        start_date=start_date,
        end_date=end_date,
    )
    result: DailyMetricListResult = DailyMetricQueryService(session).list_daily_metrics(filters)
    return DailyMetricListResponse(
        items=_map_items(result.items),
        total=result.total,
        page=result.page,
        page_size=result.page_size,
    )
