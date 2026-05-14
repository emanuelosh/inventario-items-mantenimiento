from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.core.roles import Role
from app.db.database import get_db
from app.models import InventoryItem, InventoryMovement, User
from app.services.report_service import (
    build_inventory_excel,
    build_movements_excel,
    build_inventory_pdf,
    build_movements_pdf,
)

router = APIRouter(prefix='/reports', tags=['Reports'])
REPORT_ALLOWED = (Role.ADMIN.value, Role.LIDER.value, Role.ESPECIALISTA.value, Role.GESTOR.value)


def attachment_response(stream, filename: str, media_type: str) -> StreamingResponse:
    return StreamingResponse(
        stream,
        media_type=media_type,
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.get('/inventory/excel')
def inventory_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*REPORT_ALLOWED)),
):
    items = db.scalars(select(InventoryItem).order_by(InventoryItem.code)).all()
    return attachment_response(
        build_inventory_excel(items),
        'reporte_inventario.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )


@router.get('/inventory/pdf')
def inventory_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*REPORT_ALLOWED)),
):
    items = db.scalars(select(InventoryItem).order_by(InventoryItem.code)).all()
    return attachment_response(build_inventory_pdf(items), 'reporte_inventario.pdf', 'application/pdf')


@router.get('/movements/excel')
def movements_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*REPORT_ALLOWED)),
):
    movements = db.scalars(select(InventoryMovement).order_by(InventoryMovement.created_at.desc())).all()
    return attachment_response(
        build_movements_excel(movements),
        'reporte_movimientos.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )


@router.get('/movements/pdf')
def movements_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*REPORT_ALLOWED)),
):
    movements = db.scalars(select(InventoryMovement).order_by(InventoryMovement.created_at.desc())).all()
    return attachment_response(build_movements_pdf(movements), 'reporte_movimientos.pdf', 'application/pdf')
