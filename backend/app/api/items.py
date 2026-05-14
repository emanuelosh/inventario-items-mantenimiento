from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, require_roles
from app.core.roles import Role
from app.db.database import get_db
from app.models import InventoryItem, User
from app.schemas.item import InventoryItemCreate, InventoryItemRead, InventoryItemUpdate
from app.schemas.common import MessageResponse

router = APIRouter(prefix='/items', tags=['Items'])


def item_status(item: InventoryItem) -> str:
    if item.current_stock <= item.min_stock:
        return 'low'
    if item.max_stock > 0 and item.current_stock >= item.max_stock:
        return 'high'
    return 'ok'


def serialize_item(item: InventoryItem) -> InventoryItemRead:
    return InventoryItemRead.model_validate({**item.__dict__, 'stock_status': item_status(item)})


@router.get('', response_model=list[InventoryItemRead])
def list_items(
    search: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, pattern='^(all|low|ok|high)$'),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(InventoryItem).order_by(InventoryItem.code)
    if search:
        q = f'%{search.lower()}%'
        stmt = stmt.where(or_(InventoryItem.code.ilike(q), InventoryItem.name.ilike(q)))
    items = db.scalars(stmt).all()
    if status_filter and status_filter != 'all':
        items = [i for i in items if item_status(i) == status_filter]
    return [serialize_item(i) for i in items]


@router.post('', response_model=InventoryItemRead, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN.value, Role.LIDER.value, Role.ESPECIALISTA.value)),
):
    item = InventoryItem(
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        description=payload.description.strip(),
        unit=payload.unit.strip() or 'unidad',
        current_stock=payload.current_stock,
        min_stock=payload.min_stock,
        max_stock=payload.max_stock,
        is_active=payload.is_active,
        alert_sent=payload.current_stock <= payload.min_stock,
        created_by=current_user.id,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Ya existe un artículo con ese código')
    db.refresh(item)
    return serialize_item(item)


@router.get('/code/{code}', response_model=InventoryItemRead)
def get_item_by_code(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.scalar(select(InventoryItem).where(InventoryItem.code == code.upper()))
    if not item:
        raise HTTPException(status_code=404, detail='Artículo no encontrado')
    return serialize_item(item)


@router.get('/{item_id}', response_model=InventoryItemRead)
def get_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail='Artículo no encontrado')
    return serialize_item(item)


@router.patch('/{item_id}', response_model=InventoryItemRead)
def update_item(
    item_id: UUID,
    payload: InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN.value, Role.LIDER.value, Role.ESPECIALISTA.value)),
):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail='Artículo no encontrado')

    data = payload.model_dump(exclude_unset=True)
    if 'code' in data and data['code']:
        data['code'] = data['code'].strip().upper()
    for key, value in data.items():
        setattr(item, key, value)

    if item.max_stock and item.max_stock < item.min_stock:
        raise HTTPException(status_code=400, detail='El stock máximo no puede ser menor al stock mínimo')
    if item.current_stock > item.min_stock:
        item.alert_sent = False

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Ya existe un artículo con ese código')
    db.refresh(item)
    return serialize_item(item)


@router.delete('/{item_id}', response_model=MessageResponse)
def deactivate_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN.value, Role.LIDER.value, Role.ESPECIALISTA.value)),
):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail='Artículo no encontrado')
    item.is_active = False
    db.commit()
    return MessageResponse(message='Artículo desactivado correctamente')
