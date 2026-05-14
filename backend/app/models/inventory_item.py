import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base


class InventoryItem(Base):
    __tablename__ = 'inventory_items'
    __table_args__ = (
        CheckConstraint('current_stock >= 0', name='ck_items_current_stock_nonnegative'),
        CheckConstraint('min_stock >= 0', name='ck_items_min_stock_nonnegative'),
        CheckConstraint('max_stock >= 0', name='ck_items_max_stock_nonnegative'),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default='')
    unit: Mapped[str] = mapped_column(String(40), nullable=False, default='unidad')
    current_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    alert_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    creator = relationship('User', back_populates='created_items')
    movements = relationship('InventoryMovement', back_populates='item', cascade='all, delete-orphan')
    alerts = relationship('StockAlert', back_populates='item', cascade='all, delete-orphan')
