# ═══════════════════════════════════════════════════════════════
# alembic/env.py
# ═══════════════════════════════════════════════════════════════
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context


# ── Наши модули ──
# settings — берёт DATABASE_URL из .env
from config import settings
# Base — «реестр» всех таблиц. Импорт этого модуля регистрирует
# все модели (User, Role, LDAPServer, RefreshToken) в metadata.
from auth.models import Base

# Объект конфигурации Alembic
config = context.config

# Настройка логов Alembic из alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Подставляем реальный URL БД из settings (вместо заглушки в alembic.ini)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Что Alembic будет сравнивать для autogenerate — наши модели
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Режим offline — генерирует SQL без подключения к БД."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """Выполняет миграции на переданном соединении."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Создаёт async-движок и прогоняет миграции (нужно для asyncpg)."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Режим online — подключается к реальной БД."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
