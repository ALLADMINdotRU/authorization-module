# ═══════════════════════════════════════════════════════════════
# auth/services/role_service.py
# ═══════════════════════════════════════════════════════════════
"""
Сервис управления ролями (CRUD).

ВСЕ функции асинхронные (async def), сессия db приходит параметром.
В роутере это выглядит так:
    db: AsyncSession = Depends(get_db)
    roles = await role_service.get_all_roles(db)
"""
import logging

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Role
from ..exceptions import RoleAlreadyExists, RoleInUse

logger = logging.getLogger(__name__)   # логгер "auth.services.role_service"


# ═══════════════════════════════════════════════════════════════
# СПИСОК РОЛЕЙ (с пагинацией)
# ═══════════════════════════════════════════════════════════════
async def get_all_roles(
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        ) -> tuple[list[Role], int]:
    """
    Возвращает страницу ролей + общее количество.

    Returns:
        (items, total)
    """

    # ── 1. Общее количество ──
    total = (await db.execute(select(func.count()).select_from(Role))).scalar() or 0

    # ── 2. Страница ──
    query = (
        select(Role)
        .order_by(Role.name)
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = list((await db.execute(query)).scalars().all())

    return items, total



async def create_role(db: AsyncSession, name: str, description: str | None = None) -> Role:
    """
    Создать новую роль.

    Raises:
        ValueError: если роль с таким именем уже существует
    """
    # Проверяем уникальность
    result = await db.execute(select(Role).where(Role.name == name))
    if result.scalar_one_or_none():
        raise RoleAlreadyExists(name)

    # Создаём объект (пока в памяти, не в БД)
    role = Role(name=name, description=description)

    # Добавляем в сессию
    db.add(role)
    try:
        # Фиксируем (сохраняем в БД) — в async нужен await!
        await db.commit()
    except IntegrityError:
        # защита от «гонки»: имя занято между проверкой и вставкой
        await db.rollback()
        logger.error("Дубликат при создании роли '%s'", name)
        raise RoleAlreadyExists(name)
    
    logger.info("Создана роль '%s' (id=%s)", role.name, role.id)
    return role


async def update_role(db: AsyncSession, role: Role, **kwargs) -> Role:
    """Обновить роль (переданными полями)."""
    for field, value in kwargs.items():
        if hasattr(role, field) and value is not None:                  # проверяем что есть поле и оно заполнено,
            setattr(role, field, value)                                 # то присваиваем новое значение полю объекта
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        logger.error("Дубликат имени при обновлении роли id=%s", role.id)
        raise RoleAlreadyExists(role.name)

    logger.info("Обновлена роль '%s' (id=%s)", role.name, role.id)
    return role



async def delete_role(db: AsyncSession, role: Role) -> None:
    """Удалить роль."""
    try:
        await db.delete(role)
        await db.commit()
    except IntegrityError:
        # роль назначена пользователям → БД запрещает удаление (внешний ключ)
        await db.rollback()
        logger.warning("Попытка удалить роль '%s' (id=%s), которая используется", role.name, role.id)
        raise RoleInUse(role.name)

    logger.warning("Удалена роль '%s' (id=%s)", role.name, role.id)


