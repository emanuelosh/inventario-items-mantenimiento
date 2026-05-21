"""initial schema

Revision ID: 20260512_0001
Revises:
Create Date: 2026-05-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260512_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )

    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "inventory_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("unit", sa.String(length=40), nullable=False),
        sa.Column("current_stock", sa.Integer(), nullable=False),
        sa.Column("min_stock", sa.Integer(), nullable=False),
        sa.Column("max_stock", sa.Integer(), nullable=False),
        sa.Column("alert_sent", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("current_stock >= 0", name="ck_items_current_stock_nonnegative"),
        sa.CheckConstraint("min_stock >= 0", name="ck_items_min_stock_nonnegative"),
        sa.CheckConstraint("max_stock >= 0", name="ck_items_max_stock_nonnegative"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name="fk_inventory_items_created_by_users"),
        sa.PrimaryKeyConstraint("id", name="pk_inventory_items"),
    )

    op.create_index("ix_inventory_items_code", "inventory_items", ["code"], unique=True)

    op.create_table(
        "inventory_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_code", sa.String(length=80), nullable=False),
        sa.Column("item_name", sa.String(length=180), nullable=False),
        sa.Column("movement_type", sa.String(length=20), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("stock_before", sa.Integer(), nullable=False),
        sa.Column("stock_after", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=False),
        sa.Column("performed_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("performed_by_name", sa.String(length=160), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("movement_type IN ('entrada', 'salida')", name="ck_movement_type"),
        sa.CheckConstraint("quantity > 0", name="ck_movement_quantity_positive"),
        sa.CheckConstraint("stock_before >= 0", name="ck_movement_stock_before_nonnegative"),
        sa.CheckConstraint("stock_after >= 0", name="ck_movement_stock_after_nonnegative"),
        sa.ForeignKeyConstraint(["item_id"], ["inventory_items.id"], name="fk_inventory_movements_item_id_inventory_items"),
        sa.ForeignKeyConstraint(["performed_by"], ["users.id"], name="fk_inventory_movements_performed_by_users"),
        sa.PrimaryKeyConstraint("id", name="pk_inventory_movements"),
    )

    op.create_index("ix_inventory_movements_item_id", "inventory_movements", ["item_id"], unique=False)
    op.create_index("ix_inventory_movements_performed_by", "inventory_movements", ["performed_by"], unique=False)

    op.create_table(
        "stock_alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_code", sa.String(length=80), nullable=False),
        sa.Column("item_name", sa.String(length=180), nullable=False),
        sa.Column("current_stock", sa.Integer(), nullable=False),
        sa.Column("min_stock", sa.Integer(), nullable=False),
        sa.Column("sent_to", sa.String(length=1000), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("error_message", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["item_id"], ["inventory_items.id"], name="fk_stock_alerts_item_id_inventory_items"),
        sa.PrimaryKeyConstraint("id", name="pk_stock_alerts"),
    )

    op.create_index("ix_stock_alerts_item_id", "stock_alerts", ["item_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_stock_alerts_item_id", table_name="stock_alerts")
    op.drop_table("stock_alerts")

    op.drop_index("ix_inventory_movements_performed_by", table_name="inventory_movements")
    op.drop_index("ix_inventory_movements_item_id", table_name="inventory_movements")
    op.drop_table("inventory_movements")

    op.drop_index("ix_inventory_items_code", table_name="inventory_items")
    op.drop_table("inventory_items")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")