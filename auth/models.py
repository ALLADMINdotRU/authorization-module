# ═══════════════════════════════════════════════════════════════
# auth/models.py
# ═══════════════════════════════════════════════════════════════
"""
Модели модуля авторизации: User, Role, LDAPServer.

Отличия от Flask-версии:
1. Свой Base (DeclarativeBase) — модуль самодостаточен
2. Синтаксис Mapped[] вместо db.Column()
3. Нет зависимости от Flask-SQLAlchemy
"""

from datetime import datetime
from passlib.context import CryptContext

# ═══════════════════════════════════════════════════════════════
# ХЕШИРОВАНИЕ ПАРОЛЕЙ (создаем хэш сумму, которую нельзя расшифровать)
# ═══════════════════════════════════════════════════════════════
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")    # используй алгоритм bcrypt , старые алгоритмы автоматически помечай устаревшими

# ═══════════════════════════════════════════════════════════════
# ИМПОРТЫ SQLAlchemy (современный синтаксис 2.0)
# ═══════════════════════════════════════════════════════════════
from sqlalchemy import String, Boolean, Integer, DateTime, Text, ForeignKey, Table, Column
from sqlalchemy.orm import (
    DeclarativeBase,     # базовый класс для моделей
    Mapped,              # аннотация типа колонки
    mapped_column,       # функция объявления колонки
    relationship,        # связь между таблицами
)

# Шифрование LDAP-паролей (своя утилита модуля)
from .utils.encryption import SimpleEncryptionService

# ═══════════════════════════════════════════════════════════════
# BASE — родитель всех моделей МОДУЛЯ
# ═══════════════════════════════════════════════════════════════
# Почему свой Base, а не корневой:
#   Модуль auth — переносимый. Он не знает, как называется
#   database.py в чужом проекте. Поэтому объявляет СВОЙ Base,
#   и все свои таблицы регистрирует в своём metadata.
#
# Корень на этапе подключения возьмёт Base.metadata модуля
# и создаст таблицы через create_all().
class Base(DeclarativeBase):
    pass


# ═══════════════════════════════════════════════════════════════
# АССОЦИАТИВНАЯ ТАБЛИЦА user_roles (many-to-many)
# ═══════════════════════════════════════════════════════════════
# Таблица-связка между User и Role.
# Нет отдельной модели — только Table.
user_roles = Table(
    "user_roles",
    Base.metadata,                                   # регистрируем в metadata модуля
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
)


# ═══════════════════════════════════════════════════════════════
# МОДЕЛЬ: Role
# ═══════════════════════════════════════════════════════════════
class Role(Base):
    """Роль пользователя (admin, user, operator, ...)."""

    __tablename__ = "roles"

    # Mapped[int] → Integer, primary key
    id: Mapped[int] = mapped_column(primary_key=True)

    # Mapped[str] → String, НЕ может быть NULL (нет "| None")
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Mapped[str | None] → String, МОЖЕТ быть NULL
    description: Mapped[str | None] = mapped_column(String(200))

    # Обратная связь many-to-many (парная к User.roles)
    users: Mapped[list["User"]] = relationship(
        "User", 
        secondary=user_roles,               # через связочную таблицу
        back_populates="roles"              # обратная связь в User
    )

    def __repr__(self):
        return f"<Role {self.name}>"


# ═══════════════════════════════════════════════════════════════
# МОДЕЛЬ: User
# ═══════════════════════════════════════════════════════════════
class User(Base):
    """
    Пользователь приложения.

    Может быть:
    - локальный (auth_method='local') — с хешем пароля
    - из LDAP (auth_method='ldap') — без пароля
    """

    __tablename__ = "users"

    # ── Основные поля ──
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(120), unique=True)

    # ── Профиль ──
    full_name: Mapped[str | None] = mapped_column(String(200))       # ФИО
    mobile_phone: Mapped[str | None] = mapped_column(String(20))     # мобильный
    ip_phone: Mapped[str | None] = mapped_column(String(20))         # IP-телефон
    messenger: Mapped[str | None] = mapped_column(String(100))       # мессенджер
    company: Mapped[str | None] = mapped_column(String(200))         # организация
    department: Mapped[str | None] = mapped_column(String(200))      # отдел
    position: Mapped[str | None] = mapped_column(String(200))        # должность

    # ── Статус ──
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    auth_method: Mapped[str] = mapped_column(String(20), default="local")  # 'local' | 'ldap'

    # ── Мягкое удаление ──
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"))

    # ── Связь many-to-many с Role ──
    roles: Mapped[list["Role"]] = relationship(
        "Role",
        secondary=user_roles,                    # через связочную таблицу
        back_populates="users",                  # обратная связь в Role
    )

    # ── Методы пароля (для local-пользователей) ──
    def set_password(self, password: str):
        """Установить хеш пароля."""
        self.password_hash = pwd_context.hash(password)

    def check_password(self, password: str) -> bool:
        """Проверить пароль (LDAP-пользователи всегда False)."""
        if not self.password_hash:
            return False
        return pwd_context.verify(password, self.password_hash)

    # ── Методы ролей ──
    def has_role(self, role_name: str) -> bool:
        """Есть ли у пользователя роль role_name?"""
        return any(role.name == role_name for role in self.roles)

    def is_admin(self) -> bool:
        """Является ли администратором?"""
        return self.has_role("admin")

    # ── Мягкое удаление ──
    def soft_delete(self, deleted_by_user_id: int):
        """Пометить удалённым."""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        self.deleted_by = deleted_by_user_id
        self.is_active = False

    def restore(self):
        """Восстановить."""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.is_active = True

    def __repr__(self):
        return f"<User {self.username}>"


# ═══════════════════════════════════════════════════════════════
# МОДЕЛЬ: LDAPServer
# ═══════════════════════════════════════════════════════════════
class LDAPServer(Base):
    """
    Конфигурация LDAP-сервера.

    Хранится в БД (не в .env), чтобы:
    - иметь несколько серверов (разные домены)
    - управлять приоритетом
    - вкл/выкл без перезапуска
    - хранить bind-пароль зашифрованным
    """

    __tablename__ = "ldap_servers"

    # ── Основные поля ──
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    host: Mapped[str] = mapped_column(String(128))
    port: Mapped[int] = mapped_column(Integer, default=389)          # 389 (LDAP) / 636 (LDAPS)
    domain: Mapped[str | None] = mapped_column(String(100))
    base_dn: Mapped[str | None] = mapped_column(String(200))
    use_ssl: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── Bind-учётка (для админских операций) ──
    bind_username: Mapped[str | None] = mapped_column(String(100))
    bind_password_encrypted: Mapped[str | None] = mapped_column(Text)

    # ── Поиск ──
    search_filter: Mapped[str] = mapped_column(String(256), default="(objectClass=person)")

    # ── Статус ──
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=1)        # 1 = высший
    auto_login_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # ── Даты ──
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Свойство: полный URL ──
    @property
    def server_url(self) -> str:
        """ldap://host:port или ldaps://host:port."""
        protocol = "ldaps" if self.use_ssl else "ldap"
        return f"{protocol}://{self.host}:{self.port}"

    # ── Шифрование пароля ──
    def set_bind_password(self, password: str):
        """Зашифровать и сохранить bind-пароль (пустой → None)."""
        if not password:
            self.bind_password_encrypted = None
            return
        self.bind_password_encrypted = SimpleEncryptionService.encrypt(password)

    def get_bind_password(self) -> str:
        """Расшифровать bind-пароль (ошибка → '')."""
        if not self.bind_password_encrypted:
            return ""
        try:
            return SimpleEncryptionService.decrypt(self.bind_password_encrypted)
        except Exception:
            return ""

    # ── Валидация ──
    def validate(self) -> tuple[bool, str]:
        """Проверить корректность. Возвращает (ok, сообщение)."""
        if not self.name or not self.name.strip():
            return False, "Имя сервера обязательно"
        if not (1 <= self.port <= 65535):
            return False, "Порт должен быть в диапазоне 1-65535"
        if self.priority < 1:
            return False, "Приоритет должен быть >= 1"
        return True, "OK"

    # ── Класс-метод: активные серверы ──
    @classmethod
    def get_active_servers(cls):
        """Все активные серверы, отсортированные по приоритету."""
        # ВНИМАНИЕ: в async-версии этот метод перенесём в сервис,
        # потому что .query() синхронный. Пока оставляем как есть —
        # на Этапе 6 заменим на await db.execute(select(...))
        raise NotImplementedError(
            "В async-версии используй ldap_service.get_active_servers(db)"
        )

    def __repr__(self):
        return f"<LDAPServer {self.name} ({self.host})>"