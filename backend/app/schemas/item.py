from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, model_validator


class InventoryItemBase(BaseModel):
    code: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=180)
    description: str = Field(default='', max_length=500)
    unit: str = Field(default='unidad', max_length=40)
    current_stock: int = Field(default=0, ge=0)
    min_stock: int = Field(default=0, ge=0)
    max_stock: int = Field(default=0, ge=0)
    is_active: bool = True

    @model_validator(mode='after')
    def validate_max_stock(self):
        if self.max_stock and self.max_stock < self.min_stock:
            raise ValueError('El stock máximo no puede ser menor al stock mínimo')
        return self


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=80)
    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=500)
    unit: str | None = Field(default=None, max_length=40)
    current_stock: int | None = Field(default=None, ge=0)
    min_stock: int | None = Field(default=None, ge=0)
    max_stock: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class InventoryItemRead(InventoryItemBase):
    id: UUID
    alert_sent: bool
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime
    stock_status: str

    model_config = {'from_attributes': True}
