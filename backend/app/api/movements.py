from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.config import settings
from app.core.roles import ALERT_RECIPIENT_ROLES, MovementType
from app.db.database import get_db
from app.models import InventoryItem, InventoryMovement, StockAlert, User
from app.schemas.movement import InventoryMovementCreate, InventoryMovementRead, MovementResponse
from app.services.email_service import email_service

router = APIRouter(prefix='/movements', tags=['Movements'])


@router.get('', response_model=list[InventoryMovementRead])
def list_movements(
    item_id: UUID | None = None,
    movement_type: MovementType | None = None,
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(InventoryMovement).order_by(InventoryMovement.created_at.desc()).limit(limit)
    if item_id:
        stmt = stmt.where(InventoryMovement.item_id == item_id)
    if movement_type:
        stmt = stmt.where(InventoryMovement.movement_type == movement_type.value)
    return db.scalars(stmt).all()


@router.post('', response_model=MovementResponse, status_code=status.HTTP_201_CREATED)
def create_movement(
    payload: InventoryMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.item_id and not payload.item_code:
        raise HTTPException(status_code=400, detail='Debes enviar item_id o item_code')

    if payload.item_id:
        stmt = select(InventoryItem).where(InventoryItem.id == payload.item_id).with_for_update()
    else:
        stmt = select(InventoryItem).where(InventoryItem.code == payload.item_code.upper()).with_for_update()

    item = db.scalar(stmt)
    if not item or not item.is_active:
        raise HTTPException(status_code=404, detail='Artículo no encontrado o inactivo')

    stock_before = item.current_stock
    if payload.movement_type == MovementType.SALIDA:
        if payload.quantity > stock_before:
            raise HTTPException(status_code=400, detail=f'Stock insuficiente. Disponible: {stock_before}')
        stock_after = stock_before - payload.quantity
    else:
        stock_after = stock_before + payload.quantity

    movement = InventoryMovement(
        item_id=item.id,
        item_code=item.code,
        item_name=item.name,
        movement_type=payload.movement_type.value,
        quantity=payload.quantity,
        stock_before=stock_before,
        stock_after=stock_after,
        reason=payload.reason.strip(),
        notes=payload.notes.strip(),
        performed_by=current_user.id,
        performed_by_name=current_user.full_name,
    )

    item.current_stock = stock_after

    should_send_alert = stock_after <= item.min_stock and not item.alert_sent
    if stock_after > item.min_stock:
        item.alert_sent = False
    elif should_send_alert:
        item.alert_sent = True

    db.add(movement)
    db.commit()
    db.refresh(movement)
    db.refresh(item)

    alert_sent = False
    if should_send_alert:
        recipients_users = db.scalars(select(User).where(User.role.in_([r.value for r in ALERT_RECIPIENT_ROLES]), User.is_active == True)).all()
        recipients = [u.email for u in recipients_users] + settings.stock_alert_extra_recipients_list
        alert = StockAlert(
            item_id=item.id,
            item_code=item.code,
            item_name=item.name,
            current_stock=item.current_stock,
            min_stock=item.min_stock,
            sent_to=', '.join(recipients),
            status='pending',
        )
        db.add(alert)
        db.commit()
        try:
            email_service.send_stock_alert(recipients, item.code, item.name, item.current_stock, item.min_stock)
            alert.status = 'sent'
            alert.sent_at = datetime.now(timezone.utc)
            alert_sent = True
        except Exception as exc:
            alert.status = 'failed'
            alert.error_message = str(exc)[:500]
        db.commit()

    return MovementResponse(movement=movement, alert_sent=alert_sent)
