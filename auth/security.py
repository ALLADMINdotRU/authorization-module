# ═══════════════════════════════════════════════════════════════
# auth/security.py
# ═══════════════════════════════════════════════════════════════
"""
JWT-аутентификация (аналог Flask-Login, но на токенах).

Что здесь:
1. Хеширование паролей (pwd_context) — уже знакомо
2. Создание JWT-токена (create_access_token)
3. Проверка токена и получение пользователя (get_current_user)
4. Проверка роли admin (admin_required)
"""

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .deps import get_db
from .models import User
from .schemas import TokenData





# ═══════════════════════════════════════════════════════════════
# НАСТРОЙКИ JWT — придут из корня через init_app
# ═══════════════════════════════════════════════════════════════
# Это «слоты», которые корень заполнит при инициализации модуля.
# Пока они None — если использовать до init_app, будет ошибка.
SECRET_KEY = None
ALGORITHM = None
ACCESS_TOKEN_EXPIRE_MINUTES = None


def configure_jwt(secret_key: str, algorithm: str, expire_minutes: int):
    """
    Вызывается корнем в init_app(). Заполняет настройки JWT.

    Зачем так: модуль переносимый, он не знает SECRET_KEY чужого
    проекта. Корень передаёт их сюда.
    """
    global SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
    SECRET_KEY = secret_key
    ALGORITHM = algorithm
    ACCESS_TOKEN_EXPIRE_MINUTES = expire_minutes


# ═══════════════════════════════════════════════════════════════
# OAuth2PasswordBearer — точка входа для токена
# ═══════════════════════════════════════════════════════════════
# Это стандартный механизм FastAPI: он описывает, что клиент
# должен присылать токен в заголовке "Authorization: Bearer <токен>".
# tokenUrl — куда клиент должен ходить за токеном (страница логина).
# В Swagger ( /docs ) появится кнопка "Authorize".
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


# ═══════════════════════════════════════════════════════════════
# СОЗДАНИЕ ТОКЕНА
# ═══════════════════════════════════════════════════════════════
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Создаёт JWT-токен.

    Args:
        data: данные для payload (например, {"sub": "admin"})
        expires_delta: время жизни токена (если None — из настроек)

    Returns:
        str: подписанный JWT-токен
    """
    # Копируем данные, чтобы не менять оригинал
    to_encode = data.copy()

    # Вычисляем срок годности токена
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Добавляем в payload поле exp (срок годности)
    to_encode.update({"exp": expire})

    # Подписываем токен секретным ключом
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


# ═══════════════════════════════════════════════════════════════
# ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ (аналог current_user в Flask)
# ═══════════════════════════════════════════════════════════════
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db),) -> User:
    """
    Достаёт пользователя по JWT-токену.

    Используется как зависимость в роутерах:
        @router.get("/me")
        async def me(user: User = Depends(get_current_user)):
            ...

    Алгоритм:
    1. Получить токен из заголовка (это делает oauth2_scheme)
    2. Раскодировать токен и проверить подпись
    3. Достать username из payload
    4. Найти пользователя в БД
    5. Вернуть его (или 401 если что-то не так)
    """
    # Ошибка «неавторизован» + заголовок WWW-Authenticate (стандарт OAuth2)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Раскодируем токен (проверяет подпись и срок годности)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Достаём username (мы клали его в поле "sub")
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception

        token_data = TokenData(username=username)

    except JWTError:
        # Подпись неверна или токен просрочен
        raise credentials_exception

    # Ищем пользователя в БД
    result = await db.execute(select(User).where(User.username == token_data.username))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


# ═══════════════════════════════════════════════════════════════
# ПОЛУЧЕНИЕ АКТИВНОГО ПОЛЬЗОВАТЕЛЯ (с проверкой is_active)
# ═══════════════════════════════════════════════════════════════
async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Проверяет, что пользователь активен (не заблокирован)."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Пользователь неактивен")
    return current_user


# ═══════════════════════════════════════════════════════════════
# ПРОВЕРКА РОЛИ ADMIN (аналог @admin_required во Flask)
# ═══════════════════════════════════════════════════════════════
async def admin_required(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Пропускает только администраторов."""
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав (требуется роль admin)",
        )
    return current_user