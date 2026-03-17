from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models import DailyMetric


@dataclass(frozen=True)
class DailyMetricListFilters:
    page: int = 1
    page_size: int = 30
    start_date: date | None = None
    end_date: date | None = None


@dataclass(frozen=True)
class DailyMetricListResult:
    items: list[DailyMetric]
    total: int
    page: int
    page_size: int


class DailyMetricQueryService:
    """Read-only daily metric queries used by the API layer."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_daily_metrics(self, filters: DailyMetricListFilters) -> DailyMetricListResult:
        query = select(DailyMetric)

        if filters.start_date is not None:
            query = query.where(DailyMetric.metric_date >= filters.start_date)

        if filters.end_date is not None:
            query = query.where(DailyMetric.metric_date <= filters.end_date)

        total = self._session.scalar(select(func.count()).select_from(query.subquery())) or 0
        items = list(
            self._session.scalars(
                query.order_by(desc(DailyMetric.metric_date), desc(DailyMetric.id))
                .offset((filters.page - 1) * filters.page_size)
                .limit(filters.page_size)
            )
        )

        return DailyMetricListResult(
            items=items,
            total=total,
            page=filters.page,
            page_size=filters.page_size,
        )
