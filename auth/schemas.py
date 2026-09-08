# ═══════════════════════════════════════════════════════════════
# auth/schemas.py
# ═══════════════════════════════════════════════════════════════
"""
Pydantic-схемы (аналог WTForms во Flask).

Зачем нужны отдельные схемы для создания/чтения/обновления:
- Create: что принимаем при создании (пароль нужен)
- Read:   что возвращаем клиенту (пароль НИКОГДА не возвращаем!)
- Update: что принимаем при обновлении (поля опциональны)
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ═══════════════════════════════════════════════════════════════
# БАЗОВАЯ НАСТРОЙКА (общая для всех схем)
# ═══════════════════════════════════════════════════════════════
# ConfigDict(from_attributes=True) — разрешает Pydantic читать
# данные из SQLAlchemy-моделей напрямую (obj.username, obj.email).
# Это нужно, чтобы превращать объект User из БД в JSON-ответ.
class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)



# ═══════════════════════════════════════════════════════════════
# СХЕМЫ РОЛИ
# ═══════════════════════════════════════════════════════════════

class RoleCreate(ORMModel):
    """Что принимаем при создании роли."""
    name: str
    description: str | None = None


class RoleRead(ORMModel):
    """Что возвращаем клиенту."""
    id: int
    name: str
    description: str | None = None


class RoleUpdate(ORMModel):
    """Что принимаем при обновлении роли (всё опционально)."""
    name: str | None = None
    description: str | None = None


# ═══════════════════════════════════════════════════════════════
# СХЕМЫ ПОЛЬЗОВАТЕЛЯ
# ═══════════════════════════════════════════════════════════════

class UserCreate(ORMModel):
    """Что принимаем при создании пользователя."""
    username: str
    password: str | None = None       # для LDAP-пользователей пароль не нужен
    email: EmailStr | None = None     # EmailStr — валидация email
    full_name: str | None = None
    mobile_phone: str | None = None
    ip_phone: str | None = None
    messenger: str | None = None
    company: str | None = None
    department: str | None = None
    position: str | None = None
    auth_method: str = "local"        # 'local' или 'ldap'
    is_active: bool = True


class UserRead(ORMModel):
    """Что возвращаем клиенту (БЕЗ пароля!)."""
    id: int
    username: str
    email: str | None = None
    full_name: str | None = None
    mobile_phone: str | None = None
    ip_phone: str | None = None
    messenger: str | None = None
    company: str | None = None
    department: str | None = None
    position: str | None = None
    is_active: bool
    auth_method: str
    created_at: datetime

class UserAdminRead(UserRead):
    """
    Расширенная схема для админки: включает поля мягкого удаления.
    Наследует все поля UserRead и добавляет служебные.
    """
    is_deleted: bool
    deleted_at: datetime | None = None
    deleted_by: int | None = None


class UserUpdate(ORMModel):
    """Что принимаем при обновлении (все поля опциональны)."""
    username: str | None = None
    password: str | None = None
    email: EmailStr | None = None
    full_name: str | None = None
    mobile_phone: str | None = None
    ip_phone: str | None = None
    messenger: str | None = None
    company: str | None = None
    department: str | None = None
    position: str | None = None
    auth_method: str | None = None
    is_active: bool | None = None


# ═══════════════════════════════════════════════════════════════
# СХЕМЫ LDAP-СЕРВЕРА
# ═══════════════════════════════════════════════════════════════

class LDAPServerCreate(ORMModel):
    """Что принимаем при создании LDAP-сервера."""
    name: str
    host: str
    port: int = Field(default=389, ge=1, le=65535)
    domain: str | None = None
    base_dn: str | None = None
    use_ssl: bool = False
    bind_username: str | None = None
    bind_password: str | None = None   # пароль ПРИНИМАЕМ, но не возвращаем
    search_filter: str = "(objectClass=person)"
    is_active: bool = True
    priority: int = 1
    auto_login_enabled: bool = True


class LDAPServerRead(ORMModel):
    """Что возвращаем (БЕЗ пароля)."""
    id: int
    name: str
    host: str
    port: int
    domain: str | None = None
    base_dn: str | None = None
    use_ssl: bool
    bind_username: str | None = None
    search_filter: str
    is_active: bool
    priority: int
    auto_login_enabled: bool
    created_at: datetime
    updated_at: datetime


class LDAPServerUpdate(ORMModel):
    """Что принимаем при обновлении (всё опционально)."""
    name: str | None = None
    host: str | None = None
    port: int | None = Field(default=None, ge=1, le=65535)
    domain: str | None = None
    base_dn: str | None = None
    use_ssl: bool | None = None
    bind_username: str | None = None
    bind_password: str | None = None
    search_filter: str | None = None
    is_active: bool | None = None
    priority: int | None = None
    auto_login_enabled: bool | None = None


# ═══════════════════════════════════════════════════════════════
# СХЕМЫ АУТЕНТИФИКАЦИИ (JWT) — понадобятся на Этапе 5
# ═══════════════════════════════════════════════════════════════

class Token(BaseModel):
    """Ответ при успешном входе."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Данные, зашитые в JWT-токене."""
    username: str | None = None
    