# ═══════════════════════════════════════════════════════════════
# auth/routers/users.py
# ═══════════════════════════════════════════════════════════════
"""
Роуты управления пользователями (только для админов).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_db
from ..models import User
from ..schemas import UserCreate, UserRead, UserUpdate
from ..security import admin_required
from ..services import user_service

router = APIRouter(prefix="/admin/res/users", tags=["admin-users"])


@router.get("", response_model=list[UserRead])
async def list_users(db: AsyncSession = Depends(get_db),  _admin: User = Depends(admin_required)):
    """Список всех пользователей (только админ)."""
    return await user_service.get_all_users(db)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db),  _admin: User = Depends(admin_required)):
    """Создать пользователя."""
    try:
        return await user_service.create_user(db, **data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """Получить пользователя по ID."""
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(user_id: int, data: UserUpdate, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """Обновить пользователя (частично)."""
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return await user_service.update_user(db, user, **data.model_dump(exclude_unset=True))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(admin_required)):
    """Мягкое удаление пользователя."""
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    await user_service.delete_user(db, user, admin.id)
    return None  # 204 No Content — нет тела ответа