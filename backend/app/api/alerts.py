from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.core.roles import Role
from app.db.database import get_db
from app.models import StockAlert, User
from app.schemas.alert import StockAlertRead
from app.schemas.common import MessageResponse
from app.services.email_service import email_service

router = APIRouter(prefix='/alerts', tags=['Alerts'])


@router.get('', response_model=list[StockAlertRead])
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN.value, Role.LIDER.value, Role.ESPECIALISTA.value, Role.GESTOR.value)),
):
    return db.scalars(select(StockAlert).order_by(StockAlert.created_at.desc()).limit(200)).all()


@router.post('/test-email', response_model=MessageResponse)
def test_email(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN.value)),
):
    email_service.send_email(
        [current_user.email],
        'Prueba de correo - Inventario Mantenimiento',
        '<h2>Correo de prueba enviado correctamente</h2><p>La configuración SMTP está funcionando.</p>',
    )
    return MessageResponse(message='Correo de prueba enviado correctamente')
