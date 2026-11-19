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

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_db
from ..models import User, LDAPServer
from ..schemas import LDAPServerCreate, LDAPServerRead, LDAPServerUpdate, Page, LDAPUserRead, LDAPUserImport, UserRead
from ..security import admin_required
from ..services import ldap_service
from ..exceptions import LDAPServerNotFound, LDAPConnectionFailed, LDAPUserNotFound


router = APIRouter(prefix="/admin/rest/ldap-servers", tags=["admin-ldap"])


# ═══════════════════════════════════════════════════════════════
# СПИСОК ВСЕХ LDAP-СЕРВЕРОВ (с пагинацией)
# ═══════════════════════════════════════════════════════════════
@router.get("", response_model=Page[LDAPServerRead])
async def list_servers(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы (с 1)"),
    limit: int = Query(20, ge=1, le=100, description="Размер страницы (1–100)"),
    sort_by: str = Query("id", description="Поле сортировки"),
    sort_order: str = Query("asc", description="Направление сортировка: asc | desc"),
    _admin: User = Depends(admin_required)
    ):       # только админ
    """Список LDAP-серверов с пагинацией (без паролей)."""
    items, total = await ldap_service.get_all_servers(
        db, 
        page=page, 
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        )

    pages = (total + limit - 1) // limit

    return Page(items=items, total=total, page=page, limit=limit, pages=pages)


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
    return await ldap_service.create_server(db, **data.model_dump())


# ═══════════════════════════════════════════════════════════════
# ПОЛУЧЕНИЕ ОДНОГО СЕРВЕРА ПО ID
# ═══════════════════════════════════════════════════════════════
@router.get("/{server_id}", response_model=LDAPServerRead)
async def get_server(server_id: int, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """Получить сервер по ID."""
    server = await ldap_service.get_server_by_id(db, server_id)
    if not server:
        raise LDAPServerNotFound(server_id)
    return server


# ═══════════════════════════════════════════════════════════════
# ОБНОВЛЕНИЕ СЕРВЕРА (частичное)
# ═══════════════════════════════════════════════════════════════
@router.patch("/{server_id}", response_model=LDAPServerRead)
async def update_server(server_id: int, data: LDAPServerUpdate, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """Обновить сервер (частично, только переданные поля)."""
    server = await ldap_service.get_server_by_id(db, server_id)
    if not server:
        raise LDAPServerNotFound(server_id)

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
        raise LDAPServerNotFound(server_id)
    await ldap_service.delete_server(db, server)
    return None   # 204 No Content — тело ответа пустое


# ═══════════════════════════════════════════════════════════════
# ПРОВЕРКА ПОДКЛЮЧЕНИЯ (отдельный эндпоинт)
# ═══════════════════════════════════════════════════════════════
@router.post("/{server_id}/test")
async def test_server(server_id: int, db: AsyncSession = Depends(get_db), _admin: User = Depends(admin_required)):
    """
    Проверить подключение к существующему серверу.

    Возвращает {"success": true, "message": "..."} при успехе.
    При ошибке — LDAPConnectionFailed (detail/type/code).
    """
    server = await ldap_service.get_server_by_id(db, server_id)
    if not server:
        raise LDAPServerNotFound(server_id)

    ok, message = await ldap_service.test_connection(db, server)
    if not ok:
        raise LDAPConnectionFailed(message)
    return {"success": True, "message": message}


# ═══════════════════════════════════════════════════════════════
# СПИСОК ПОЛЬЗОВАТЕЛЕЙ ДОМЕНА (LDAP)
# ═══════════════════════════════════════════════════════════════
@router.get("/{server_id}/users", response_model=Page[LDAPUserRead])
async def list_ldap_users(
    server_id: int,
    page: int = Query(1, ge=1, description="Номер страницы (с 1)"),
    limit: int = Query(20, ge=1, le=100, description="Размер страницы (1–100)"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
):
    """
    Список пользователей домена (из LDAP) с пагинацией.

    Для каждого: 
    username	string	короткий логин (sAMAccountName)
    full_name	string | null	ФИО
    email	string | null	почта
    thumbnail	string | null	аватар в base64 → <img src="data:image/jpeg;base64,...">
    in_db	bool	уже есть в БД?
    is_active	bool	вход разрешён (true = не заблокирован)

    """
    server = await ldap_service.get_server_by_id(db, server_id)
    if not server:
        raise LDAPServerNotFound(server_id)

    items, total = await ldap_service.get_ldap_users(db, server, page=page, limit=limit)
    pages = (total + limit - 1) // limit

    return Page(items=items, total=total, page=page, limit=limit, pages=pages)


# ═══════════════════════════════════════════════════════════════
# ИМПОРТ ПОЛЬЗОВАТЕЛЯ ДОМЕНА В БД
# ═══════════════════════════════════════════════════════════════
@router.post("/{server_id}/import", response_model=UserRead)
async def import_ldap_user(
    server_id: int,
    data: LDAPUserImport,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
):
    """
    Импортировать пользователя домена в БД.

    Тело: {"username": "ivanov", "is_active": true}
    is_active=false → добавить и сразу заблокировать (запретить вход).
    """
    server = await ldap_service.get_server_by_id(db, server_id)
    if not server:
        raise LDAPServerNotFound(server_id)

    return await ldap_service.import_ldap_user(db, server, data.username, data.is_active)


