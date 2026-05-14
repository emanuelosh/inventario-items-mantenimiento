from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from app.core.roles import MovementType


class InventoryMovementCreate(BaseModel):
    item_id: UUID | None = None
    item_code: str | None = Field(default=None, min_length=2, max_length=80)
    movement_type: MovementType
    quantity: int = Field(gt=0)
    reason: str = Field(default='', max_length=255)
    notes: str = Field(default='', max_length=500)


class InventoryMovementRead(BaseModel):
    id: UUID
    item_id: UUID
    item_code: str
    item_name: str
    movement_type: MovementType
    quantity: int
    stock_before: int
    stock_after: int
    reason: str
    notes: str
    performed_by: UUID
    performed_by_name: str
    created_at: datetime

    model_config = {'from_attributes': True}


class MovementResponse(BaseModel):
    ok: bool = True
    message: str = 'Movimiento registrado correctamente'
    movement: InventoryMovementRead
    alert_sent: bool = False
