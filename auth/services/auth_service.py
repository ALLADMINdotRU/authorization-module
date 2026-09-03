# ═══════════════════════════════════════════════════════════════
# auth/services/auth_service.py
# ═══════════════════════════════════════════════════════════════
"""
Главный сервис аутентификации.

Определяет метод входа:
- local: проверка хеша пароля в БД
- ldap:  проверка через Active Directory
"""


import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import User
from ..models import pwd_context
from . import ldap_service

logger = logging.getLogger(__name__)


async def authenticate(db: AsyncSession, username: str, password: str):
    """
    Аутентифицировать пользователя (локально или через LDAP).

    Алгоритм:
    1. Ищем пользователя в БД по username
    2. Нашли + auth_method='local' → проверяем хеш пароля
    3. Нашли + auth_method='ldap' → проверяем через LDAP
    4. Не нашли → пробуем LDAP (может, новый пользователь)

    Returns:
        User или None
    """
    # 1. Ищем пользователя
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if user:
        # 2. Пользователь найден — по методу
        if user.auth_method == "local":
            # Локальный — проверяем хеш пароля
            if not user.check_password(password):
                return None
            logger.info(f"Локальная аутентификация успешна: {username}")
            return user

        elif user.auth_method == "ldap":
            # LDAP — проверяем через AD
            ldap_user = await ldap_service.authenticate_ldap(db, username, password)
            if ldap_user:
                logger.info(f"LDAP-аутентификация успешна: {username}")
                return ldap_user
            return None

        else:
            logger.error(f"Неизвестный метод аутентификации: {user.auth_method}")
            return None

    # 3. Пользователь не найден → пробуем LDAP (вдруг новый)
    servers = await ldap_service.get_active_servers(db)
    if servers:
        ldap_user = await ldap_service.authenticate_ldap(db, username, password)
        if ldap_user:
            logger.info(f"Новый пользователь создан через LDAP: {username}")
            return ldap_user

    # 4. Ничего не подошло
    logger.info(f"Аутентификация не удалась: {username}")
    return None


async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверить пароль по хешу (для локальной авторизации)."""
    return pwd_context.verify(plain_password, hashed_password)