# ═══════════════════════════════════════════════════════════════
# auth/routers/roles.py
# ═══════════════════════════════════════════════════════════════
"""
Роуты управления ролями (только для админов).

Полный CRUD:
- GET    /auth/admin/roles        — список ролей
- POST   /auth/admin/roles        — создать роль
- GET    /auth/admin/roles/{id}   — получить роль
- PATCH  /auth/admin/roles/{id}   — обновить роль (частично)
- DELETE /auth/admin/roles/{id}   — удалить роль
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_db
from ..models import User, Role
from ..schemas import RoleCreate, RoleRead, RoleUpdate
from ..security import admin_required
from ..services import role_service

# APIRouter — набор маршрутов (аналог Flask Blueprint)
# prefix="/admin/roles" — все URL начинаются с /auth/admin/roles
# (потому что главный router в AuthModule имеет prefix="/auth")
# tags=["admin-roles"] — группировка в Swagger
router = APIRouter(prefix="/admin/rest/roles", tags=["admin-roles"])


# ═══════════════════════════════════════════════════════════════
# СПИСОК ВСЕХ РОЛЕЙ
# ═══════════════════════════════════════════════════════════════
@router.get("", response_model=list[RoleRead])
async def list_roles(db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """
    Получить список всех ролей.
    """
    return await role_service.get_all_roles(db) 


# ═══════════════════════════════════════════════════════════════
# СОЗДАНИЕ РОЛИ
# ═══════════════════════════════════════════════════════════════
@router.post("", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
async def create_role(data: RoleCreate, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """
    Создать новую роль.
    """
    try:
        return await role_service.create_role(db, **data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# ПОЛУЧЕНИЕ ОДНОЙ РОЛИ ПО ID
# ═══════════════════════════════════════════════════════════════
@router.get("/{role_id}", response_model=RoleRead)
async def get_role(role_id: int, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """
    Получить роль по ID.

    role_id: int — FastAPI сам достанет {role_id} из URL и
    преобразует в число. Если в URL будет не число (например "/abc"),
    FastAPI вернёт 422 автоматически.
    """
    role = await role_service.get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")
    return role


# ═══════════════════════════════════════════════════════════════
# ОБНОВЛЕНИЕ РОЛИ (частичное)
# ═══════════════════════════════════════════════════════════════
@router.patch("/{role_id}", response_model=RoleRead)
async def update_role(role_id: int, data: RoleUpdate, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """
    Частично обновить роль.

    PATCH (не PUT) — потому что обновление ЧАСТИЧНОЕ:
    клиент может прислать только description, не трогая name.

    exclude_unset=True — в словарь попадут только те поля,
    которые клиент реально передал (остальные пропустим).
    """
    role = await role_service.get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")

    return await role_service.update_role(
        db, role, **data.model_dump(exclude_unset=True)
    )


# ═══════════════════════════════════════════════════════════════
# УДАЛЕНИЕ РОЛИ
# ═══════════════════════════════════════════════════════════════
@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(role_id: int, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """
    Удалить роль.

    status_code=204 — "No Content": успешное удаление, тело ответа пустое.
    Функция возвращает None — FastAPI отдаст пустой ответ с кодом 204.
    """
    role = await role_service.get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")

    await role_service.delete_role(db, role)
    return None   # 204 No Content — тела нет