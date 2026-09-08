# ═══════════════════════════════════════════════════════════════
# auth/routers/auth.py
# ═══════════════════════════════════════════════════════════════
"""
Роуты аутентификации: вход (cookie), , выход, профиль.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_db
from ..models import User
from ..schemas import Token, UserRead
from .. import security 
from ..services import auth_service
from ..middleware.rate_limit import limiter, get_login_limit

router = APIRouter(tags=["auth"])


# ═══════════════════════════════════════════════════════════════
# ВХОД — получение JWT-токена
# ═══════════════════════════════════════════════════════════════
@router.post("/login")
@limiter.limit(get_login_limit)   # лимит читается из settings (RATE_LIMIT_LOGIN)
async def login(
    request: Request,              # обязателен для slowapi
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
    ):
    """
    Вход → ставит JWT-токен в HttpOnly cookie.

    Токен НЕ возвращается в JSON — он прячется в cookie,
    которую JS не может прочитать (защита от XSS).
    """
    # Аутентифицируем (локально или через LDAP)
    user = await auth_service.authenticate(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )

    # Создаём токен (кладём логин в поле "sub")
    access_token = security.create_access_token(data={"sub": user.username})

    # Ставим HttpOnly cookie
    response.set_cookie(
        key=security.COOKIE_NAME,                               # имя cookie (из security.py)
        value=access_token,
        httponly=True,                                          # JS не может прочитать
        secure=security.COOKIE_SECURE,                          # только HTTPS (в проде True)
        samesite="lax",                                         # защита от CSRF
        max_age=security.ACCESS_TOKEN_EXPIRE_MINUTES * 60,      # срок жизни (сек)
    )

    return {"message": "Вход выполнен"}


# ═══════════════════════════════════════════════════════════════
# Выход → удаляет cookie с токеном.
# ═══════════════════════════════════════════════════════════════
@router.post("/logout")
async def logout(response: Response):
    """
    Выход → удаляет cookie с токеном.
    """
    response.delete_cookie(security.COOKIE_NAME)
    return {"message": "Выход выполнен"}



# ═══════════════════════════════════════════════════════════════
# ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ (профиль)
# ═══════════════════════════════════════════════════════════════
@router.get("/me", response_model=UserRead)
async def read_me(
    current_user: User = Depends(security.get_current_active_user),
):
    """
    Информация о текущем пользователе.

    get_current_active_user достаёт пользователя по токену.
    Токен приходит в заголовке Authorization: Bearer ...
    """
    return current_user