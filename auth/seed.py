# ═══════════════════════════════════════════════════════════════
# auth/seed.py
# ═══════════════════════════════════════════════════════════════
"""
Seed-скрипт: создаёт стандартные роли и администратора при старте.

Безопасен для многократного запуска — проверяет существование
перед созданием (если роль/пользователь уже есть — не создаёт заново).
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import User, Role

logger = logging.getLogger(__name__)

async def seed_defaults(db: AsyncSession):
    """
    Создать стандартные роли ('admin', 'user') и администратора.

    Args:
        db: асинхронная сессия БД (передаётся из startup)

    Логика:
    1. Создать роли admin и user, если их нет
    2. Создать пользователя admin/admin, если его нет
    3. Если admin уже есть, но без роли admin — добавить роль
    """

    # ═══════════════════════════════════════════════════════════
    # ШАГ 1. Стандартные роли
    # ═══════════════════════════════════════════════════════════
    default_roles = {
        "admin": "Администратор системы",
        "user": "Обычный пользователь",
    }

    for role_name, role_desc in default_roles.items():
        # Проверяем: есть ли уже такая роль?
        result = await db.execute(select(Role).where(Role.name == role_name))
        existing = result.scalar_one_or_none()

        if not existing:
            # Роли нет — создаём
            role = Role(name=role_name, description=role_desc)
            db.add(role)
            logger.info(f"Создана роль: {role_name}")

    # flush() — отправляем SQL в БД, но НЕ коммитим.(чтобы роли получили id, но без коммита)
    await db.flush()

    # ═══════════════════════════════════════════════════════════
    # ШАГ 2. Достаём роли (теперь они точно существуют)
    # ═══════════════════════════════════════════════════════════
    admin_role = (await db.execute(select(Role).where(Role.name == "admin"))).scalar_one_or_none()
    user_role = (await db.execute(select(Role).where(Role.name == "user"))).scalar_one_or_none()

    # ═══════════════════════════════════════════════════════════
    # ШАГ 3. Администратор
    # ═══════════════════════════════════════════════════════════
    # Загружаем admin С РОЛЯМИ (selectinload — обязательно в async!)
    result = await db.execute(select(User).where(User.username == "admin").options(selectinload(User.roles)))   # ← грузим roles сразу
    admin = result.scalar_one_or_none()


    if not admin:
        # Админа нет — создаём
        admin = User(
            username="admin",
            email="admin@localhost",
            full_name="Администратор",
            auth_method="local",
            is_active=True,
        )
        admin.set_password("admin")          # пароль: admin

        # Добавляем роли
        if admin_role:
            admin.roles.append(admin_role)
        if user_role:
            admin.roles.append(user_role)

        db.add(admin)
        logger.info("Создан администратор (admin / admin)")
    else:
        # Админ есть — проверяем, что у него есть роль admin
        if admin_role and not admin.has_role("admin"):
            admin.roles.append(admin_role)
            logger.info("Роль 'admin' добавлена существующему администратору")

    # ═══════════════════════════════════════════════════════════
    # ШАГ 4. Сохраняем всё
    # ═══════════════════════════════════════════════════════════
    await db.commit()
    logger.info("Seed-данные применены")