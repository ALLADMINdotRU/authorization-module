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
from . import ldap_service

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# АУТЕНТИФИКАЦИЯ (логин = username | email | UPN)
# ═══════════════════════════════════════════════════════════════
async def authenticate(db: AsyncSession, login: str, password: str):
    """
    Аутентифицировать пользователя (локально или через LDAP).

    login может быть:
    - username (локальный или LDAP)
    - email    (локальный или LDAP)
    - UPN      (ivanov@domain)

    Returns:
        User или None

    Алгоритм:
    1. Ищем пользователя в БД по username
    2. Нашли + auth_method='local' → проверяем хеш пароля
    3. Нашли + auth_method='ldap' → проверяем через LDAP
    4. Не нашли → пробуем LDAP (может, новый пользователь)

    Returns:
        User или None
    """
    # 1.  Ищем пользователя по username ИЛИ email
    result = await db.execute(select(User).where((User.username == login)|(User.email == login)))
    user = result.scalar_one_or_none()

    if user:
        # 2. Пользователь найден — по методу
        if user.auth_method == "local":
            # Локальный — проверяем хеш пароля
            if not user.check_password(password):
                return None
            logger.info(f"Локальная аутентификация успешна: {login}")
            return user

        elif user.auth_method == "ldap":
            # LDAP — проверяем через AD
            # LDAP → ВАЖНО: передаём user.username (не login),
            # потому что login мог быть email ("ivanov@email.com"),
            # а LDAP работает по username ("ivanov" / "ivanov@domain").
            ldap_user = await ldap_service.authenticate_ldap(db, user.username, password)
            if ldap_user:
                logger.info(f"LDAP-аутентификация успешна: {login}")
                return ldap_user
            return None

        else:
            logger.error(f"Неизвестный метод аутентификации: {user.auth_method}")
            return None

    # 3. Пользователь не найден → пробуем LDAP (вдруг новый)
    servers = await ldap_service.get_active_servers(db)
    if servers:
        # 2a. Обычная LDAP-аутентификация (username / UPN / DOMAIN\login)
        ldap_user = await ldap_service.authenticate_ldap(db, login, password)
        if ldap_user:
            logger.info(f"Новый пользователь создан через LDAP: {login}")
            return ldap_user
        
        # 3b. Если login содержит @ → возможно это EMAIL, а не UPN.
        # Пробуем найти пользователя в LDAP по атрибуту mail.
        if "@" in login:
            ldap_user = await ldap_service.authenticate_ldap_by_email(db, login, password)
            if ldap_user:
                logger.info("Пользователь найден по email в LDAP: %s", login)
                return ldap_user
            
    # 4. Ничего не подошло
    logger.info(f"Аутентификация не удалась: {login}")
    return None
