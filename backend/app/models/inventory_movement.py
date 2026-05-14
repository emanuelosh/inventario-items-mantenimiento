import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base


class InventoryMovement(Base):
    __tablename__ = 'inventory_movements'
    __table_args__ = (
        CheckConstraint("movement_type IN ('entrada', 'salida')", name='ck_movement_type'),
        CheckConstraint('quantity > 0', name='ck_movement_quantity_positive'),
        CheckConstraint('stock_before >= 0', name='ck_movement_stock_before_nonnegative'),
        CheckConstraint('stock_after >= 0', name='ck_movement_stock_after_nonnegative'),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('inventory_items.id'), nullable=False, index=True)
    item_code: Mapped[str] = mapped_column(String(80), nullable=False)
    item_name: Mapped[str] = mapped_column(String(180), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_before: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False, default='')
    notes: Mapped[str] = mapped_column(String(500), nullable=False, default='')
    performed_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    performed_by_name: Mapped[str] = mapped_column(String(160), nullable=False, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    item = relationship('InventoryItem', back_populates='movements')
    performer = relationship('User', back_populates='movements')
