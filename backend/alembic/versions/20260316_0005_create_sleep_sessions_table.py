"""create sleep sessions table

Revision ID: 20260316_0005
Revises: 20260316_0004
Create Date: 2026-03-16 19:13:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260316_0005"
down_revision = "20260316_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sleep_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_sleep_id", sa.String(length=64), nullable=False),
        sa.Column("sleep_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sleep_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("deep_sleep_seconds", sa.Float(), nullable=True),
        sa.Column("light_sleep_seconds", sa.Float(), nullable=True),
        sa.Column("rem_sleep_seconds", sa.Float(), nullable=True),
        sa.Column("awake_seconds", sa.Float(), nullable=True),
        sa.Column("sleep_score", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sleep_sessions")),
        sa.UniqueConstraint("source_sleep_id", name="uq_sleep_sessions_source_sleep_id"),
    )


def downgrade() -> None:
    op.drop_table("sleep_sessions")
