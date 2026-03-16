from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DailyMetric(Base):
    __tablename__ = "daily_metrics"
    __table_args__ = (UniqueConstraint("metric_date", name="uq_daily_metrics_metric_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    metric_date: Mapped[date] = mapped_column(Date, nullable=False)
    resting_heart_rate: Mapped[int | None] = mapped_column(Integer)
    body_battery: Mapped[int | None] = mapped_column(Integer)
    stress_score: Mapped[int | None] = mapped_column(Integer)
    steps: Mapped[int | None] = mapped_column(Integer)
    floors_climbed: Mapped[int | None] = mapped_column(Integer)
    calories_burned: Mapped[int | None] = mapped_column(Integer)
    sleep_seconds: Mapped[int | None] = mapped_column(Integer)
