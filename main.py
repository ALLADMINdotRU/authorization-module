"""
Точка входа FastAPI-приложения.

Запуск:
    uvicorn main:app --reload
    uvicorn fastapi_auth.main:app --reload  (из корня проекта)

Swagger-документация:
    http://localhost:8000/docs
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

# Импортируем наши модули
from config import settings
from database import engine, Base, get_db, AsyncSessionLocal
from auth import AuthModule                   # ← импорт модуля
from auth.models import Base as AuthBase      # ← «тетрадь» таблиц модуля
from auth.seed import seed_defaults           # ← импорт seed


import logging
import os
from logging.handlers import RotatingFileHandler
# ═══════════════════════════════════════════════════════════════
# ЗАДАЕМ ПАРАМЕТРЫ ОБЩЕГО ЛОГА
# ═══════════════════════════════════════════════════════════════
os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[
        logging.StreamHandler(),                                  # консоль
        RotatingFileHandler("logs/app.log", maxBytes=5_000_000,   # общий файл
                            backupCount=5, encoding="utf-8"),
    ],
)



# ═══════════════════════════════════════════════════════════════
# СОЗДАЁМ ПРИЛОЖЕНИЕ
# ═══════════════════════════════════════════════════════════════
fastapi_app = FastAPI(
    title="Auth API",                                       # название в Swagger
    description="Модуль авторизации (FastAPI + async)",     # описание в Swagger
    version="1.0.0",                                        # версия
)


logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# ГЛОБАЛЬНЫЙ ОБРАБОТЧИК НЕПРЕДВИДЕННЫХ ИСКЛЮЧЕНИЙ
# ═══════════════════════════════════════════════════════════════
@fastapi_app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Ловит ВСЕ непредвиденные исключения из любых роутов.

    - traceback всегда пишется в консоль (для разработчика);
    - на фронтенд отдаём причину ТОЛЬКО в режиме DEBUG.
    """
    # logger.exception печатает полный traceback (уровень ERROR)
    logger.exception("Необработанная ошибка: %s", exc)

    if settings.DEBUG:
        content = {
            "detail": str(exc),            # текст ошибки
            "type": type(exc).__name__,    # имя класса исключения
        }
    else:
        content = {"detail": "Внутренняя ошибка сервера"}

    return JSONResponse(status_code=500, content=content)


# ═══════════════════════════════════════════════════════════════
# СОБЫТИЕ: СТАРТ ПРИЛОЖЕНИЯ  — создаём таблицы и seed-данные
# ═══════════════════════════════════════════════════════════════
# @fastapi_app.on_event("startup") — аналог вызова seed_defaults() в create_app()
# Выполняется ОДИН раз при старте сервера
@fastapi_app.on_event("startup")
async def on_startup():
    """
    Создаёт таблицы модуля auth при старте и стандартные роли/админа..

    Разбор конструкции:
    - async with engine.begin() as conn:
        асинхронно открывает соединение и начинает транзакцию

    - await conn.run_sync(Base.metadata.create_all):
        Base.metadata.create_all — СИНХРОННАЯ функция SQLAlchemy,
        которая создаёт все объявленные таблицы.
        run_sync запускает её в отдельном потоке, чтобы не блокировать
        event loop (об этом паттерне подробнее на этапе с LDAP).
    """
    # 1. Создаём таблицы
    async with engine.begin() as conn:
        await conn.run_sync(AuthBase.metadata.create_all)

    # 2. Seed: роли и админ
    # Открываем отдельную сессию для seed
    async with AsyncSessionLocal() as db:
        await seed_defaults(db)


# ═══════════════════════════════════════════════════════════════
# ИНИЦИАЛИЗАЦИЯ МОДУЛЯ
# ═══════════════════════════════════════════════════════════════
# Создаём экземпляр модуля и передаём ему всё нужное
auth_module = AuthModule()
auth_module.init_app(
    app=fastapi_app,
    settings=settings,
    get_db=get_db,
)

# Подключаем роутер модуля к приложению
fastapi_app.include_router(auth_module.router)


# ═══════════════════════════════════════════════════════════════
# ТЕСТОВЫЙ МАРШРУТ (для проверки что сервер работает)
# ═══════════════════════════════════════════════════════════════
@fastapi_app.get("/")
async def root():
    """
    Корневой маршрут — проверка что сервер жив.

    @app.get("/") — аналог @app.route("/") в Flask, но только для GET.
    FastAPI требует явно указывать метод: @app.get, @app.post, @app.put, @app.delete.
    """
    return {
        "message": "Auth API работает",
        "docs": "/docs",
        "version": "1.0.0",
    }


# ═══════════════════════════════════════════════════════════════
# ПРОВЕРКА ЗДОРОВЬЯ (health check)
# ═══════════════════════════════════════════════════════════════
@fastapi_app.get("/health")
async def health():
    """Проверка здоровья сервера (для мониторинга)."""
    return {"status": "ok"}