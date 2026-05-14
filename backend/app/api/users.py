from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.core.roles import Role
from app.core.security import hash_password
from app.db.database import get_db
from app.models import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.schemas.common import MessageResponse
from app.services.email_service import email_service

router = APIRouter(prefix='/users', tags=['Users'])


@router.get('', response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN.value, Role.LIDER.value, Role.ESPECIALISTA.value)),
):
    return db.scalars(select(User).order_by(User.created_at.desc())).all()


@router.post('', response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN.value)),
):
    email = payload.email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail='Ya existe un usuario con este correo')

    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role.value,
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if payload.send_welcome_email:
        try:
            email_service.send_welcome_user(user.email, user.full_name, user.role, payload.password)
        except Exception as exc:
            print(f'No se pudo enviar correo de bienvenida: {exc}')

    return user


@router.patch('/{user_id}', response_model=UserRead)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN.value)),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')

    data = payload.model_dump(exclude_unset=True)
    if 'role' in data and data['role'] is not None:
        data['role'] = data['role'].value
    for key, value in data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete('/{user_id}', response_model=MessageResponse)
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN.value)),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    user.is_active = False
    db.commit()
    return MessageResponse(message='Usuario desactivado correctamente')
