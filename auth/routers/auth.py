# ═══════════════════════════════════════════════════════════════
# auth/routers/auth.py
# ═══════════════════════════════════════════════════════════════
"""
Роуты аутентификации: вход (cookie), , выход, профиль.
"""

from fastapi import APIRouter, Depends, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_db
from ..models import User
from ..schemas import Token, UserRead
from .. import security 
from ..services import auth_service, refresh_service
from ..middleware.rate_limit import limiter, get_login_limit
from ..exceptions import InvalidCredentials, Unauthorized

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
    Вход → ставит JWT и refresh токены в HttpOnly cookie.

    Токен НЕ возвращается в JSON — он прячется в cookie,
    которую JS не может прочитать (защита от XSS).
    """
    # Аутентифицируем (локально или через LDAP)
    user = await auth_service.authenticate(db, form_data.username, form_data.password)

    if not user:
        raise InvalidCredentials()

    # ── 1. Access-токен (JWT, короткий) ──
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


    # ── 2. Refresh-токен (в БД, долгий) ──
    refresh_token = await refresh_service.create_refresh_token(
        db,
        user.id,
        expire_days=security.REFRESH_TOKEN_EXPIRE_DAYS,
    )
    response.set_cookie(
        key=security.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=security.COOKIE_SECURE,
        samesite="lax",
        max_age=security.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # дни → секунды
    )

    return {"message": "Вход выполнен"}


# ═══════════════════════════════════════════════════════════════
# Выход → удаляет cookie с токеном.
# ═══════════════════════════════════════════════════════════════
@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Выход → отзываем refresh и удаляем обе cookie.
    """
    refresh_token = request.cookies.get(security.REFRESH_COOKIE_NAME)
    if refresh_token:
        # помечаем refresh отозванным в БД — он больше не сработает
        await refresh_service.revoke_refresh_token(db, refresh_token)

    response.delete_cookie(security.COOKIE_NAME)
    response.delete_cookie(security.REFRESH_COOKIE_NAME)

    return {"message": "Выход выполнен"}


# ═══════════════════════════════════════════════════════════════
# Ротация refresh токена 
# ═══════════════════════════════════════════════════════════════
@router.post("/refresh")
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Обновляет токены по валидному refresh-токену (ротация).

    Логика:
    1. читаем refresh из cookie;
    2. проверяем (не отозван, не истёк) → получаем user_id;
    3. отзываем старый refresh, выдаём новый (ротация);
    4. выдаём новый access;
    5. ставим оба в cookie.
    """
    refresh_token = request.cookies.get(security.REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise Unauthorized()

    user_id = await refresh_service.verify_refresh_token(db, refresh_token)     # проверяем валиден ли токен если да , возвращаем id пользователя
    if user_id is None:
        raise Unauthorized()

    user = await db.get(User, user_id)
    if not user:
        raise Unauthorized()

    # ── Ротация: старый отзываем, новый выдаём ──
    await refresh_service.revoke_refresh_token(db, refresh_token)
    new_refresh = await refresh_service.create_refresh_token(
        db, user.id, expire_days=security.REFRESH_TOKEN_EXPIRE_DAYS
    )

    # ── Новый access ──
    access_token = security.create_access_token(data={"sub": user.username})

    response.set_cookie(
        key=security.COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=security.COOKIE_SECURE,
        samesite="lax",
        max_age=security.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key=security.REFRESH_COOKIE_NAME,
        value=new_refresh,
        httponly=True,
        secure=security.COOKIE_SECURE,
        samesite="lax",
        max_age=security.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return {"message": "Токены обновлены"}


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