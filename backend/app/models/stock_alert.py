import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base


class StockAlert(Base):
    __tablename__ = 'stock_alerts'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('inventory_items.id'), nullable=False, index=True)
    item_code: Mapped[str] = mapped_column(String(80), nullable=False)
    item_name: Mapped[str] = mapped_column(String(180), nullable=False)
    current_stock: Mapped[int] = mapped_column(Integer, nullable=False)
    min_stock: Mapped[int] = mapped_column(Integer, nullable=False)
    sent_to: Mapped[str] = mapped_column(String(1000), nullable=False, default='')
    status: Mapped[str] = mapped_column(String(30), nullable=False, default='pending')
    error_message: Mapped[str] = mapped_column(String(500), nullable=False, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    item = relationship('InventoryItem', back_populates='alerts')
