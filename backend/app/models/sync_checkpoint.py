from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SyncCheckpoint(Base):
    __tablename__ = "sync_checkpoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sync_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_source_id: Mapped[str | None] = mapped_column(String(128))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
