from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from app.core.roles import Role


class UserBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    role: Role = Role.COLABORADOR
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    send_welcome_email: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    role: Role | None = None
    is_active: bool | None = None


class UserRead(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserRead
