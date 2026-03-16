from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SleepSession(Base):
    __tablename__ = "sleep_sessions"
    __table_args__ = (UniqueConstraint("source_sleep_id", name="uq_sleep_sessions_source_sleep_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_sleep_id: Mapped[str] = mapped_column(String(64), nullable=False)
    sleep_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sleep_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    deep_sleep_seconds: Mapped[float | None] = mapped_column(Float)
    light_sleep_seconds: Mapped[float | None] = mapped_column(Float)
    rem_sleep_seconds: Mapped[float | None] = mapped_column(Float)
    awake_seconds: Mapped[float | None] = mapped_column(Float)
    sleep_score: Mapped[int | None] = mapped_column(Integer)
