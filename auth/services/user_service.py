# ═══════════════════════════════════════════════════════════════
# auth/services/user_service.py
# ═══════════════════════════════════════════════════════════════
"""
Сервис управления пользователями (CRUD).
"""
import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError          # для перехвата дубликатов логов
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import User
from ..exceptions import UserAlreadyExists

logger = logging.getLogger(__name__)               # логгер этого модуля ("auth.services.user_service")

async def get_all_users(db: AsyncSession, include_deleted: bool = True) -> list[User]:
    """
    Все пользователи.

    Args:
        db: сессия БД
        include_deleted: True = показать и удалённых, False = только активные
    """
    query = select(User).order_by(User.username)

    if not include_deleted:
        query = query.where(~User.is_deleted)   # только активные

    result = await db.execute(query)
    return list(result.scalars().all())


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """Найти пользователя по ID."""
    return await db.get(User, user_id)


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    """Найти пользователя по логину."""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, username: str, password: str | None = None, **kwargs) -> User:
    """
    Создать пользователя.

    Raises:
        ValueError: если пользователь с таким username уже существует
    """
    # Проверяем уникальность
    existing = await get_user_by_username(db, username)
    if existing:
        raise UserAlreadyExists(username)

    # Создаём объект (без пароля — передаётся отдельно)
    user = User(username=username, **kwargs)

    # Если пароль передан — хешируем его
    if password:
        user.set_password(password)

    db.add(user)
    try:
        await db.commit()
    except IntegrityError:          # Дубликат email (или гонка с username) → откатываем и отдаём 400
        await db.rollback()
        logger.error("Дубликат email/username при создании пользователя '%s'", username)
        raise UserAlreadyExists(username)

    await db.refresh(user)      # refresh — перечитать объект из БД (получить id, created_at)
    logger.info("Создан пользователь '%s' (id=%s)", username, user.id)
    return user


async def update_user(db: AsyncSession, user: User, **kwargs) -> User:
    """Обновить пользователя (переданными полями)."""
    for field, value in kwargs.items():
        if hasattr(user, field) and value is not None:
            # Особый случай — пароль хешируем отдельно
            if field == "password" and value:
                user.set_password(value)
            else:
                setattr(user, field, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        logger.error("Дубликат email/username при обновлении пользователя id=%s", user.id)
        raise UserAlreadyExists(user.username)

    await db.refresh(user)
    logger.info("Обновлён пользователь '%s' (id=%s)", user.username, user.id)
    return user

# ═══════════════════════════════════════════════════════════════
# Мягкое удаление пользователя.
# ═══════════════════════════════════════════════════════════════
async def delete_user(db: AsyncSession, user: User, deleted_by_user_id: int) -> None:
    """
    Не удаляет строку из БД физически, а помечает:
    - is_deleted = True
    - deleted_at = текущее время
    - deleted_by = id того, кто удалил
    - is_active = False (деактивируем)

    Args:
        db: сессия БД
        user: объект User для удаления
        deleted_by_user_id: id администратора, который удаляет (для аудита)
    """
    # soft_delete — метод модели User (см. models.py)
    # он сам проставляет все флаги
    user.soft_delete(deleted_by_user_id)

    # Сохраняем изменения
    await db.commit()

    # WARNING, а не INFO — удаление это «важное» событие для аудита
    logger.warning(
        "Пользователь '%s' (id=%s) удалён админом id=%s",
        user.username, user.id, deleted_by_user_id,
    )

# ═══════════════════════════════════════════════════════════════
# Восстановить удалённого пользователя.
# ═══════════════════════════════════════════════════════════════
async def restore_user(db: AsyncSession, user: User) -> User:
    """
    Сбрасывает флаги мягкого удаления:
    - is_deleted = False
    - deleted_at = None
    - deleted_by = None
    - is_active = True (возвращаем в активное состояние)

    Args:
        db: сессия БД
        user: объект User для восстановления
    """
    # restore — метод модели User (см. models.py)
    user.restore()

    # Сохраняем изменения
    await db.commit()
    await db.refresh(user)

    logger.info("Пользователь '%s' (id=%s) восстановлен", user.username, user.id)
    return user
