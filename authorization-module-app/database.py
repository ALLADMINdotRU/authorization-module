"""
Асинхронное подключение к базе данных.

1. Создаём engine (движок) ОДИН раз
2. Для каждого запроса создаём НОВУЮ сессию
3. После запроса сессию закрываем

Это паттерн "Unit of Work" — каждый запрос работает в своей сессии.
"""

# create_async_engine — создаёт подключение к БД
# async_sessionmaker — фабрика для создания сессий
from sqlalchemy.ext.asyncio import (
    create_async_engine,        # асинхронный движок
    async_sessionmaker,         # фабрика асинхронных сессий
    AsyncSession,               # тип асинхронной сессии
)
from sqlalchemy.orm import  DeclarativeBase

# Импортируем настройки
from config import settings

# ═══════════════════════════════════════════════════════════════
# ENGINE (движок) — ОДИН на всё приложение
# ═══════════════════════════════════════════════════════════════
# create_async_engine принимает URL подключения
# echo=False — не выводить SQL-запросы в консоль (включить для отладки)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,                                    # True = видеть все SQL-запросы
)


# ═══════════════════════════════════════════════════════════════
# ФАБРИКА АСИНХРОННЫХ СЕССИЙ — создаёт сессии
# ═══════════════════════════════════════════════════════════════
# async_sessionmaker — создаёт НОВУЮ сессию на каждый запрос.
# expire_on_commit=False: после commit() объекты НЕ становятся
# «протухшими» — можно читать их атрибуты без повторного запроса.
AsyncSessionLocal  = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ═══════════════════════════════════════════════════════════════
# BASE CLASS — родитель всех моделей
# ═══════════════════════════════════════════════════════════════
# В Flask: class User(db.Model) — db = SQLAlchemy()
# В FastAPI: class User(Base) — Base = DeclarativeBase()
# Оба подхода делают одно и то же: регистрируют модель в метаданных SQLAlchemy
class Base(DeclarativeBase):
    pass


# ═══════════════════════════════════════════════════════════════
# DEPENDENCY — получение сессии (вызывается FastAPI автоматически)
# ═══════════════════════════════════════════════════════════════
async def get_db():
    """
    Создаёт асинхронную сессию на время одного запроса.

    Разбор:
    - async def    → это корутина, работает в event loop
    - async with   → асинхронный контекстный менеджер:
                     __aenter__ открывает сессию
                     __aexit__  закрывает её (ДАЖЕ при ошибке)
    - yield db     → отдаёт сессию в роутер, после выхода закрывает

    Использование в роутере:
        @router.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as db:
        yield db


