"""create sync checkpoints table

Revision ID: 20260317_0008
Revises: 20260316_0007
Create Date: 2026-03-17 10:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260317_0008"
down_revision = "20260316_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sync_checkpoints",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sync_key", sa.String(length=128), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_source_id", sa.String(length=128), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sync_checkpoints")),
        sa.UniqueConstraint("sync_key", name=op.f("uq_sync_checkpoints_sync_key")),
    )


def downgrade() -> None:
    op.drop_table("sync_checkpoints")
