"""add sync status fields

Revision ID: 20260319_0009
Revises: 20260317_0008
Create Date: 2026-03-19 15:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260319_0009"
down_revision: str | None = "20260317_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("sync_checkpoints", sa.Column("last_attempted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("sync_checkpoints", sa.Column("last_succeeded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("sync_checkpoints", sa.Column("last_run_status", sa.String(length=32), nullable=True))
    op.add_column(
        "sync_checkpoints",
        sa.Column("consecutive_failures", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("sync_checkpoints", sa.Column("last_error_summary", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("sync_checkpoints", "last_error_summary")
    op.drop_column("sync_checkpoints", "consecutive_failures")
    op.drop_column("sync_checkpoints", "last_run_status")
    op.drop_column("sync_checkpoints", "last_succeeded_at")
    op.drop_column("sync_checkpoints", "last_attempted_at")
