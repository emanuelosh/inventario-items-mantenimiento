from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.core.roles import Role
from app.db.database import get_db
from app.models import User
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserRead

router = APIRouter(prefix='/auth', tags=['Auth'])


@router.post('/login', response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Correo o contraseña inválidos')
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Usuario inactivo')

    token = create_access_token(str(user.id), {'role': user.role, 'email': user.email})
    return TokenResponse(access_token=token, user=user)


@router.post('/register', response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Registro inicial.
    - Si no existe ningún usuario, el primero se crea como admin.
    - Si ya existen usuarios, se crea como colaborador.
    Para creación controlada de cuentas, usar POST /users con token admin.
    """
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=409, detail='Ya existe un usuario con este correo')

    total_users = db.scalar(select(func.count(User.id))) or 0
    role = Role.ADMIN.value if total_users == 0 else Role.COLABORADOR.value

    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id), {'role': user.role, 'email': user.email})
    return TokenResponse(access_token=token, user=user)


@router.get('/me', response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
