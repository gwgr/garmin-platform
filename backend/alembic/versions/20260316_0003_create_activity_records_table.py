"""create activity records table

Revision ID: 20260316_0003
Revises: 20260316_0002
Create Date: 2026-03-16 19:11:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260316_0003"
down_revision = "20260316_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "activity_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("record_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("elapsed_seconds", sa.Float(), nullable=True),
        sa.Column("distance_meters", sa.Float(), nullable=True),
        sa.Column("latitude_degrees", sa.Float(), nullable=True),
        sa.Column("longitude_degrees", sa.Float(), nullable=True),
        sa.Column("altitude_meters", sa.Float(), nullable=True),
        sa.Column("heart_rate", sa.Integer(), nullable=True),
        sa.Column("cadence", sa.Integer(), nullable=True),
        sa.Column("speed_mps", sa.Float(), nullable=True),
        sa.Column("power_watts", sa.Integer(), nullable=True),
        sa.Column("temperature_celsius", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE", name=op.f("fk_activity_records_activity_id_activities")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity_records")),
    )


def downgrade() -> None:
    op.drop_table("activity_records")
