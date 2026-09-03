# ═══════════════════════════════════════════════════════════════
# auth/routers/ldap_servers.py
# ═══════════════════════════════════════════════════════════════
"""
Роуты управления LDAP-серверами (только для админов).

Особенности этого роута:
1. bind-пароль ПРИНИМАЕМ, но НИКОГДА не возвращаем клиенту
2. Есть отдельный эндпоинт "проверить подключение"
3. Пароль при сохранении шифруется (Fernet)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_db
from ..models import User, LDAPServer
from ..schemas import LDAPServerCreate, LDAPServerRead, LDAPServerUpdate
from ..security import admin_required
from ..services import ldap_service

router = APIRouter(prefix="/admin/ldap-servers", tags=["admin-ldap"])


# ═══════════════════════════════════════════════════════════════
# СПИСОК ВСЕХ СЕРВЕРОВ
# ═══════════════════════════════════════════════════════════════
@router.get("", response_model=list[LDAPServerRead])
async def list_servers(db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):       # только админ
    """Список всех LDAP-серверов (без паролей)."""
    # response_model=LDAPServerRead — пароль bind_password не попадёт в ответ
    servers = await ldap_service.get_all_servers(db)
    return servers


# ═══════════════════════════════════════════════════════════════
# СОЗДАНИЕ СЕРВЕРА
# ═══════════════════════════════════════════════════════════════
@router.post("", response_model=LDAPServerRead, status_code=status.HTTP_201_CREATED)
async def create_server(data: LDAPServerCreate, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """
    Создать LDAP-сервер.

    Вход: все поля из LDAPServerCreate (включая bind_password).
    Выход: LDAPServerRead (БЕЗ пароля).
    """
    try:
        return await ldap_service.create_server(db, **data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# ПОЛУЧЕНИЕ ОДНОГО СЕРВЕРА ПО ID
# ═══════════════════════════════════════════════════════════════
@router.get("/{server_id}", response_model=LDAPServerRead)
async def get_server(server_id: int, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """Получить сервер по ID."""
    server = await ldap_service.get_server_by_id(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Сервер не найден")
    return server


# ═══════════════════════════════════════════════════════════════
# ОБНОВЛЕНИЕ СЕРВЕРА (частичное)
# ═══════════════════════════════════════════════════════════════
@router.patch("/{server_id}", response_model=LDAPServerRead)
async def update_server(server_id: int, data: LDAPServerUpdate, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """Обновить сервер (частично, только переданные поля)."""
    server = await ldap_service.get_server_by_id(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Сервер не найден")

    # exclude_unset=True — берём только те поля, что клиент реально передал
    return await ldap_service.update_server(db, server, **data.model_dump(exclude_unset=True))


# ═══════════════════════════════════════════════════════════════
# УДАЛЕНИЕ СЕРВЕРА
# ═══════════════════════════════════════════════════════════════
@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(server_id: int, db: AsyncSession = Depends(get_db),  _admin: User = Depends(admin_required)):
    """Удалить сервер."""
    server = await ldap_service.get_server_by_id(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Сервер не найден")
    await ldap_service.delete_server(db, server)
    return None   # 204 No Content — тело ответа пустое


# ═══════════════════════════════════════════════════════════════
# ПРОВЕРКА ПОДКЛЮЧЕНИЯ (отдельный эндпоинт)
# ═══════════════════════════════════════════════════════════════
@router.post("/{server_id}/test")
async def test_server(server_id: int, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """
    Проверить подключение к существующему серверу.

    Возвращает {"success": true, "message": "..."}.
    """
    server = await ldap_service.get_server_by_id(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Сервер не найден")

    success, message = await ldap_service.test_connection(db, server)
    return {"success": success, "message": message}