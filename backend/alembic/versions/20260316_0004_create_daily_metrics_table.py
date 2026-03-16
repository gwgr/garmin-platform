"""create daily metrics table

Revision ID: 20260316_0004
Revises: 20260316_0003
Create Date: 2026-03-16 19:12:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260316_0004"
down_revision = "20260316_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "daily_metrics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("metric_date", sa.Date(), nullable=False),
        sa.Column("resting_heart_rate", sa.Integer(), nullable=True),
        sa.Column("body_battery", sa.Integer(), nullable=True),
        sa.Column("stress_score", sa.Integer(), nullable=True),
        sa.Column("steps", sa.Integer(), nullable=True),
        sa.Column("floors_climbed", sa.Integer(), nullable=True),
        sa.Column("calories_burned", sa.Integer(), nullable=True),
        sa.Column("sleep_seconds", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_daily_metrics")),
        sa.UniqueConstraint("metric_date", name="uq_daily_metrics_metric_date"),
    )


def downgrade() -> None:
    op.drop_table("daily_metrics")
