# ═══════════════════════════════════════════════════════════════
# auth/routers/users.py
# ═══════════════════════════════════════════════════════════════
"""
Роуты управления пользователями (только для админов).
"""

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_db
from ..models import User
from ..schemas import UserCreate, UserRead, UserAdminRead, UserUpdate, Page
from ..security import admin_required
from ..services import user_service
from ..exceptions import UserNotFound, UserNotDeleted

router = APIRouter(prefix="/admin/rest/users", tags=["admin-users"])


# ═══════════════════════════════════════════════════════════════
# СПИСОК ПОЛЬЗОВАТЕЛЕЙ (с пагинацией)
# ═══════════════════════════════════════════════════════════════
@router.get("", response_model=Page[UserAdminRead])
async def list_users(
    include_deleted: bool = Query(True, description="Показывать удалённых пользователей"),
    page: int = Query(1, ge=1, description="Номер страницы (с 1)"),
    limit: int = Query(20, ge=1, le=100, description="Размер страницы (1–100)"),
    db: AsyncSession = Depends(get_db), 
    _admin: User = Depends(admin_required),
    ):
    """
    Список пользователей с пагинацией.

    Возвращает НЕ голый список, а структуру:
        { items, total, page, limit, pages }

    Примеры:
        ?page=1&limit=20          → 1-я страница по 20
        ?include_deleted=true     → включая удалённых
    """

    # Сервис возвращает (элементы страницы, общее количество)
    items, total = await user_service.get_all_users(
        db,
        include_deleted=include_deleted,
        page=page,
        limit=limit,
    )

    # pages — сколько всего страниц = total / limit с округлением ВВЕРХ.
    # (total + limit - 1) // limit — целочисленный ceil.
    # Пример: total=153, limit=20 → (153+19)//20 = 8 страниц.
    pages = (total + limit - 1) // limit


    return Page(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db),  _admin: User = Depends(admin_required)):
    """Создать пользователя."""
    return await user_service.create_user(db, **data.model_dump())


@router.get("/{user_id}", response_model=UserAdminRead)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """Получить пользователя по ID."""
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise UserNotFound(user_id)
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(user_id: int, data: UserUpdate, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """Обновить пользователя (частично)."""
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise UserNotFound(user_id)
    return await user_service.update_user(db, user, **data.model_dump(exclude_unset=True))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(admin_required)):
    """Мягкое удаление пользователя."""
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise UserNotFound(user_id)
    await user_service.delete_user(db, user, admin.id)
    return None  # 204 No Content — нет тела ответа


# ═══════════════════════════════════════════════════════════════
# Восстановить удалённого пользователя.
# ═══════════════════════════════════════════════════════════════
@router.post("/{user_id}/restore", response_model=UserAdminRead)
async def restore_user(user_id: int, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """
    Только для админов. Возвращает восстановленного пользователя.
    """
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise UserNotFound(user_id)

    # Защита: нельзя «восстановить» пользователя, который не был удалён.
    # Иначе restore() сбросил бы is_active и случайно разблокировал активного.
    if not user.is_deleted:
        raise UserNotFound(user_id)

    return await user_service.restore_user(db, user)
