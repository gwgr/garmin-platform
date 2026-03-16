"""create activity laps table

Revision ID: 20260316_0002
Revises: 20260316_0001
Create Date: 2026-03-16 19:10:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260316_0002"
down_revision = "20260316_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "activity_laps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("lap_index", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("distance_meters", sa.Float(), nullable=True),
        sa.Column("average_heart_rate", sa.Integer(), nullable=True),
        sa.Column("max_heart_rate", sa.Integer(), nullable=True),
        sa.Column("calories", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE", name=op.f("fk_activity_laps_activity_id_activities")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity_laps")),
        sa.UniqueConstraint("activity_id", "lap_index", name="uq_activity_laps_activity_id_lap_index"),
    )


def downgrade() -> None:
    op.drop_table("activity_laps")
