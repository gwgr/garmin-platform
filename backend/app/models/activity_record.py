from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ActivityRecord(Base):
    __tablename__ = "activity_records"
    __table_args__ = (Index("ix_activity_records_record_time", "record_time"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    record_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    elapsed_seconds: Mapped[float | None] = mapped_column(Float)
    distance_meters: Mapped[float | None] = mapped_column(Float)
    latitude_degrees: Mapped[float | None] = mapped_column(Float)
    longitude_degrees: Mapped[float | None] = mapped_column(Float)
    altitude_meters: Mapped[float | None] = mapped_column(Float)
    heart_rate: Mapped[int | None] = mapped_column(Integer)
    cadence: Mapped[int | None] = mapped_column(Integer)
    speed_mps: Mapped[float | None] = mapped_column(Float)
    power_watts: Mapped[int | None] = mapped_column(Integer)
    temperature_celsius: Mapped[float | None] = mapped_column(Float)
