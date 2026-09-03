# ═══════════════════════════════════════════════════════════════
# auth/routers/auth.py
# ═══════════════════════════════════════════════════════════════
"""
Роуты аутентификации: вход (получение токена), профиль.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_db
from ..models import User
from ..schemas import Token, UserRead
from ..security import (
    create_access_token,
    get_current_user,
    get_current_active_user,
)
from ..services import auth_service

router = APIRouter(tags=["auth"])


# ═══════════════════════════════════════════════════════════════
# ВХОД — получение JWT-токена
# ═══════════════════════════════════════════════════════════════
@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Вход в систему → выдаёт JWT-токен.

    OAuth2PasswordRequestForm — стандартная форма FastAPI.
    Она ожидает, что клиент пришлёт (form-data, НЕ JSON):
        username: логин
        password: пароль

    В Swagger (/docs) для этого роута появится кнопка "Try it out",
    где можно ввести логин/пароль.
    """
    # Аутентифицируем (локально или через LDAP)
    user = await auth_service.authenticate(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Создаём токен (кладём логин в поле "sub")
    access_token = create_access_token(data={"sub": user.username})

    return Token(access_token=access_token, token_type="bearer")


# ═══════════════════════════════════════════════════════════════
# ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ (профиль)
# ═══════════════════════════════════════════════════════════════
@router.get("/me", response_model=UserRead)
async def read_me(
    current_user: User = Depends(get_current_active_user),
):
    """
    Информация о текущем пользователе.

    get_current_active_user достаёт пользователя по токену.
    Токен приходит в заголовке Authorization: Bearer ...
    """
    return current_user