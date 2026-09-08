# ═══════════════════════════════════════════════════════════════
# auth/services/ldap_service.py
# ═══════════════════════════════════════════════════════════════
"""
LDAP-сервис: аутентификация, поиск, фабрика конфигурации.

Ключевая идея: LDAP-библиотека (ldap3) — СИНХРОННАЯ.
Поэтому все синхронные вызовы LDAP оборачиваем в run_in_executor,
чтобы не блокировать event loop FastAPI.
"""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import User, Role, LDAPServer
from ..ldap import (
    LDAPConfig,
    LDAPConnection,
    LDAPRepository,
    LDAPBindError,
    LDAPConnectionError,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# ФАБРИКА: LDAPServer (модель БД) → LDAPConfig (для библиотеки)
# ═══════════════════════════════════════════════════════════════
def build_ldap_config(server: LDAPServer, username: str = None, password: str = None) -> LDAPConfig:
    """
    Создать LDAPConfig из модели LDAPServer.

    Логика выбора учётки:
    - переданы username+password → аутентификация пользователя
    - иначе → bind-учётка сервера (админские операции)
    """
    if username and password:                                                       # если есть имя юзера И он с паролём... т.е. для авторизации пользователя на сайте
        ldap_user = username
        ldap_password = password
        if '@' not in ldap_user and '\\' not in ldap_user and server.domain:        # 
            ldap_user = f"{ldap_user}@{server.domain}"
    else:                                                                          # если нет имени Юзернейма или Пассворда... т.е. это подключение к LDAP где логин и пароль берется из БД конфигурации сервера LDAP
        ldap_user = server.bind_username or ''
        ldap_password = server.get_bind_password()   # расшифровываем пароль

    server_url = server.host
    if server.port and server.port not in (389, 636):
        server_url = f"{server_url}:{server.port}"

    return LDAPConfig(
        server_url=server_url,
        user=ldap_user,
        password=ldap_password,
        base_dn=server.base_dn or '',
        use_ssl=server.use_ssl,
    )


# ═══════════════════════════════════════════════════════════════
# ПОЛУЧЕНИЕ АКТИВНЫХ СЕРВЕРОВ (async, заменяет get_active_servers)
# ═══════════════════════════════════════════════════════════════
async def get_active_servers(db: AsyncSession) -> list[LDAPServer]:
    """Все активные LDAP-серверы, отсортированные по приоритету."""
    result = await db.execute(
        select(LDAPServer).where(LDAPServer.is_active == True)  # noqa: E712
        .order_by(LDAPServer.priority)
    )
    return list(result.scalars().all())


# ═══════════════════════════════════════════════════════════════
# СИНХРОННАЯ LDAP-АУТЕНТИФИКАЦИЯ (будет запущена в потоке)
# ═══════════════════════════════════════════════════════════════
def _authenticate_ldap_sync(server: LDAPServer, username: str, password: str) -> bool:
    """
    Синхронная проверка логина/пароля через LDAP.

    Эта функция СИНХРОННАЯ — она будет вызвана через run_in_executor.

    Returns:
        True если подключение (bind) успешно = пароль верный
    """
    config = build_ldap_config(server, username=username, password=password)
    try:
        with LDAPConnection(config) as conn:
            return conn.is_connected
    except (LDAPBindError, LDAPConnectionError) as e:
        logger.warning(f"LDAP-аутентификация не удалась: {e}")
        return False


# ═══════════════════════════════════════════════════════════════
# СИНХРОННЫЙ ПОИСК ПОЛЬЗОВАТЕЛЯ (для получения данных из LDAP)
# ═══════════════════════════════════════════════════════════════
def _search_ldap_sync(server: LDAPServer, search_filter: str, attributes: list = None):
    """Синхронный поиск в LDAP (для run_in_executor)."""
    config = build_ldap_config(server)
    with LDAPConnection(config) as conn:
        repo = LDAPRepository(conn)
        return repo.search_users(search_filter, attributes=attributes)


# ═══════════════════════════════════════════════════════════════
# АСИНХРОННАЯ АУТЕНТИФИКАЦИЯ ЧЕРЕЗ LDAP (главная функция)
# ═══════════════════════════════════════════════════════════════
async def authenticate_ldap(db: AsyncSession, username_input: str, password: str):
    """
    Аутентифицировать пользователя через LDAP.

    Алгоритм:
    1. Разобрать логин (user@domain → user + domain)
    2. Взять активные серверы
    3. Для каждого: проверить пароль (в потоке, через run_in_executor)
    4. Найти/создать пользователя в БД

    Returns:
        User или None
    """
    # 1. Парсим логин
    username, input_domain = _parse_username(username_input)

    # 2. Активные серверы
    servers = await get_active_servers(db)
    if not servers:
        logger.warning("Нет активных LDAP-серверов")
        return None

    # 3. Если указан домен — фильтруем
    if input_domain:
        servers = [s for s in servers if s.domain == input_domain]
        if not servers:
            return None

    # 4. Пробуем каждый сервер
    for server in servers:
        # Формируем полный логин
        auth_username = username_input if input_domain else (
            f"{username}@{server.domain}" if server.domain else username
        )

        # Асинхронно вызываем синхронную LDAP-проверку
        loop = asyncio.get_running_loop()
        ok = await loop.run_in_executor(
            None, _authenticate_ldap_sync, server, auth_username, password
        )

        if not ok:
            continue  # пароль не подошёл → следующий сервер

        # Пароль верен → ищем пользователя в БД
        db_username = f"{username}@{server.domain}" if server.domain else username
        result = await db.execute(
            select(User).where(
                (User.username == db_username) & (User.auth_method == "ldap")
            )
        )
        user = result.scalar_one_or_none()

        if user:
            return user

        # Пользователя нет → создаём если разрешено
        if server.auto_login_enabled:
            return await _create_user_from_ldap(db, username, server)

        return None

    logger.warning(f"Аутентификация не удалась для {username_input}")
    return None


# ═══════════════════════════════════════════════════════════════
# ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ ИЗ LDAP (async)
# ═══════════════════════════════════════════════════════════════
async def get_ldap_user_data(db: AsyncSession, username: str, server: LDAPServer = None) -> dict:
    """Получить данные пользователя из LDAP (ФИО, отдел и т.д.)."""
    if server is None:
        servers = await get_active_servers(db)
        if not servers:
            return {}
        server = servers[0]

    loop = asyncio.get_running_loop()
    try:
        users = await loop.run_in_executor(
            None, _search_ldap_sync, server, f"(sAMAccountName={username})", None
        )
        return users[0] if users else {}
    except (LDAPBindError, LDAPConnectionError) as e:
        logger.error(f"Ошибка получения данных из LDAP: {e}")
        return {}


# ═══════════════════════════════════════════════════════════════
# СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ В БД ИЗ LDAP (async)
# ═══════════════════════════════════════════════════════════════
async def _create_user_from_ldap(db: AsyncSession, username: str, server: LDAPServer) -> User:
    """Создать пользователя в БД на основе данных из LDAP."""
    full_username = f"{username}@{server.domain}" if server.domain else username

    # Проверяем что нет дубля
    result = await db.execute(select(User).where(User.username == full_username))
    if result.scalar_one_or_none():
        return result.scalar_one_or_none()

    # Получаем данные из LDAP
    ldap_data = await get_ldap_user_data(db, username, server)
    if not ldap_data:
        return None

    # Создаём
    user = User(
        username=full_username,
        auth_method="ldap",
        is_active=True,
        full_name=ldap_data.get("cn"),
        company=ldap_data.get("company"),
        department=ldap_data.get("department"),
        position=ldap_data.get("title"),
        mobile_phone=ldap_data.get("mobile"),
        ip_phone=ldap_data.get("ipPhone"),
        messenger=ldap_data.get("pager"),
        email=ldap_data.get("mail"),
    )

    # Роль "user" по умолчанию
    role_result = await db.execute(select(Role).where(Role.name == "user"))
    user_role = role_result.scalar_one_or_none()
    if user_role:
        user.roles.append(user_role)

    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info(f"Создан LDAP-пользователь: {full_username}")
    return user


# ═══════════════════════════════════════════════════════════════
# ВСПОМОГАТЕЛЬНАЯ: парсинг логина
# ═══════════════════════════════════════════════════════════════
def _parse_username(username_input: str) -> tuple[str, str | None]:
    """Разобрать логин на (username, domain)."""
    if '@' in username_input:
        parts = username_input.split('@', 1)
        return parts[0], parts[1]
    elif '\\' in username_input:
        parts = username_input.split('\\', 1)
        return parts[1], parts[0]
    return username_input, None


# ═══════════════════════════════════════════════════════════════
# БЛОК: CRUD ДЛЯ LDAP-СЕРВЕРОВ
# ═══════════════════════════════════════════════════════════════
# Эти функции используются роутером ldap_servers.py.
# Вся работа с БД асинхронная (await), сессия db приходит параметром.


async def get_all_servers(db: AsyncSession) -> list[LDAPServer]:
    """
    Получить ВСЕ LDAP-серверы (включая неактивные).

    В отличие от get_active_servers (которая берёт только is_active=True),
    здесь нужны ВСЕ — админ должен видеть и отключенные серверы,
    чтобы их можно было включить/отредактировать.

    Returns:
        list[LDAPServer] — список серверов, отсортированных по приоритету
    """
    result = await db.execute(select(LDAPServer).order_by(LDAPServer.priority))
    return list(result.scalars().all())


async def get_server_by_id(db: AsyncSession, server_id: int) -> LDAPServer | None:
    """
    Найти сервер по ID (или None, если не найден).
    """
    return await db.get(LDAPServer, server_id)


async def create_server(db: AsyncSession, bind_password: str | None = None, **kwargs,) -> LDAPServer:
    """
    Создать новый LDAP-сервер.

    Args:
        db: сессия БД
        bind_password: bind-пароль (шифруется отдельно, не в kwargs)
        **kwargs: остальные поля (name, host, port, domain, ...)

    Почему bind_password отдельно:
        Пароль нельзя просто положить в объект — его нужно ЗАШИФРОВАТЬ.
        А остальные поля можно присвоить напрямую через **kwargs.

    Returns:
        LDAPServer — созданный объект

    Raises:
        ValueError — если сервер с таким именем уже существует
    """
    # ── 1. Проверяем уникальность имени ──
    if "name" in kwargs:
        result = await db.execute(
            select(LDAPServer).where(LDAPServer.name == kwargs["name"])
        )
        if result.scalar_one_or_none():
            raise ValueError(f"Сервер '{kwargs['name']}' уже существует")

    # ── 2. Создаём объект (остальные поля через **kwargs) ──
    # LDAPServer(**kwargs) = LDAPServer(name="DC01", host="...", port=389, ...)
    server = LDAPServer(**kwargs)

    # ── 3. Шифруем пароль (если передан) ──
    # set_bind_password() внутри вызывает Fernet-шифрование
    if bind_password:
        server.set_bind_password(bind_password)

    # ── 4. Сохраняем в БД ──
    db.add(server)          # добавляем объект в сессию
    await db.commit()       # фиксируем (INSERT в БД)
    await db.refresh(server)  # перечитать из БД (получить id, created_at)

    return server


async def update_server(db: AsyncSession, server: LDAPServer, bind_password: str | None = None, **kwargs,) -> LDAPServer:
    """
    Обновить существующий сервер.

    Args:
        db: сессия БД
        server: существующий объект LDAPServer (из БД)
        bind_password: новый пароль (если нужно сменить; None = не менять)
        **kwargs: поля для обновления (только переданные клиентом)

    Логика пароля:
        - если bind_password передан → шифруем и сохраняем
        - если не передан (None) → оставляем старый пароль нетронутым
    """
    # ── 1. Обновляем обычные поля ──
    # Проходим по всем переданным полям
    for field, value in kwargs.items():
        # hasattr(server, field) — есть ли такое поле у модели
        # value is not None — не обновляем если пришёл None
        if hasattr(server, field) and value is not None:
            setattr(server, field, value)   # server.field = value

    # ── 2. Шифруем пароль, если прислали новый ──
    if bind_password:
        server.set_bind_password(bind_password)

    # ── 3. Сохраняем ──
    await db.commit()
    await db.refresh(server)

    return server


async def delete_server(db: AsyncSession, server: LDAPServer) -> None:
    """
    Удалить сервер из БД.
    """
    await db.delete(server)
    await db.commit()


# ═══════════════════════════════════════════════════════════════
# БЛОК: ПРОВЕРКА ПОДКЛЮЧЕНИЯ
# ═══════════════════════════════════════════════════════════════

async def test_connection(db: AsyncSession, server: LDAPServer,) -> tuple[bool, str]:
    """
    Проверить подключение к LDAP-серверу.

    Используется в админке, чтобы проверить настройки сервера
    без перезапуска приложения.

    Returns:
        tuple[bool, str] — (успех, сообщение)

    Важно: сама проверка СИНХРОННАЯ (ldap3 блокирует), поэтому
    оборачиваем её в run_in_executor, чтобы не блокировать event loop.
    """
    loop = asyncio.get_running_loop()

    try:
        # Запускаем синхронную проверку в отдельном потоке
        ok = await loop.run_in_executor(
            None,                  # None = стандартный пул потоков
            _test_connection_sync,  # синхронная функция
            server,                # её аргумент
        )
        if ok:
            return True, "Подключение успешно"
        return False, "Не удалось подключиться"

    except Exception as e:
        return False, f"Ошибка: {e}"


def _test_connection_sync(server: LDAPServer) -> bool:
    """
    Синхронная проверка подключения.

    Эта функция СИНХРОННАЯ (не async) — она блокирует поток,
    пока идёт LDAP-запрос. Поэтому вызывается через run_in_executor.

    Returns:
        bool — True если подключение (bind) успешно
    """
    # Строим конфиг из модели (используем bind-учётку сервера)
    config = build_ldap_config(server)

    try:
        # with LDAPConnection(config) — открываем соединение
        # conn.is_connected — проверяем что bind прошёл
        with LDAPConnection(config) as conn:
            return conn.is_connected
    except (LDAPBindError, LDAPConnectionError):
        # Неверные учётки или сервер недоступен
        return False