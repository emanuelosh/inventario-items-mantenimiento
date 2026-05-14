from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class StockAlertRead(BaseModel):
    id: UUID
    item_id: UUID
    item_code: str
    item_name: str
    current_stock: int
    min_stock: int
    sent_to: str
    status: str
    error_message: str
    created_at: datetime
    sent_at: datetime | None

    model_config = {'from_attributes': True}
