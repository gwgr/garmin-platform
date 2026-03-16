"""create devices table

Revision ID: 20260316_0006
Revises: 20260316_0005
Create Date: 2026-03-16 19:14:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260316_0006"
down_revision = "20260316_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_device_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("manufacturer", sa.String(length=128), nullable=True),
        sa.Column("model", sa.String(length=128), nullable=True),
        sa.Column("serial_number", sa.String(length=128), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_devices")),
        sa.UniqueConstraint("source_device_id", name="uq_devices_source_device_id"),
    )


def downgrade() -> None:
    op.drop_table("devices")
