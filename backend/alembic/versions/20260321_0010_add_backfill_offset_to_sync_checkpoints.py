"""add backfill offset to sync checkpoints

Revision ID: 20260321_0010
Revises: 20260319_0009
Create Date: 2026-03-21 17:15:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260321_0010"
down_revision = "20260319_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sync_checkpoints", sa.Column("backfill_offset", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("sync_checkpoints", "backfill_offset")
