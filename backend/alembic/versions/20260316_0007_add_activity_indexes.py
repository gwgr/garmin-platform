"""add activity indexes

Revision ID: 20260316_0007
Revises: 20260316_0006
Create Date: 2026-03-16 19:20:00
"""

from __future__ import annotations

from alembic import op


revision = "20260316_0007"
down_revision = "20260316_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_activities_start_time", "activities", ["start_time"], unique=False)
    op.create_index("ix_activities_sport", "activities", ["sport"], unique=False)
    op.create_index("ix_activities_distance_meters", "activities", ["distance_meters"], unique=False)
    op.create_index("ix_activity_records_record_time", "activity_records", ["record_time"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_activity_records_record_time", table_name="activity_records")
    op.drop_index("ix_activities_distance_meters", table_name="activities")
    op.drop_index("ix_activities_sport", table_name="activities")
    op.drop_index("ix_activities_start_time", table_name="activities")
