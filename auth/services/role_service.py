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

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Role


async def get_all_roles(db: AsyncSession) -> list[Role]:
    """
    Получить все роли.

    Разбор async-запроса:
    1. select(Role)          — строим SQL-запрос "SELECT * FROM roles"
    2. await db.execute(...) — асинхронно выполняем (не блокируя event loop)
    3. result.scalars()      — извлекаем объекты Role из результата
    4. .all()                — в список
    """
    result = await db.execute(select(Role).order_by(Role.name))
    return list(result.scalars().all())


async def get_role_by_id(db: AsyncSession, role_id: int) -> Role | None:
    """Найти роль по ID (или None)."""
    # db.get() — короткая форма для "SELECT по primary key"
    return await db.get(Role, role_id)


async def create_role(db: AsyncSession, name: str, description: str | None = None) -> Role:
    """
    Создать новую роль.

    Raises:
        ValueError: если роль с таким именем уже существует
    """
    # Проверяем уникальность
    result = await db.execute(select(Role).where(Role.name == name))
    if result.scalar_one_or_none():
        raise ValueError(f"Роль '{name}' уже существует")

    # Создаём объект (пока в памяти, не в БД)
    role = Role(name=name, description=description)

    # Добавляем в сессию
    db.add(role)
    # Фиксируем (сохраняем в БД) — в async нужен await!
    await db.commit()

    return role


async def update_role(db: AsyncSession, role: Role, **kwargs) -> Role:
    """Обновить роль (переданными полями)."""
    for field, value in kwargs.items():
        if hasattr(role, field) and value is not None:                  # проверяем что есть поле и оно заполнено,
            setattr(role, field, value)                                 # то присваиваем новое значение полю объекта
    await db.commit()
    return role


async def delete_role(db: AsyncSession, role: Role) -> None:
    """Удалить роль."""
    await db.delete(role)
    await db.commit()


