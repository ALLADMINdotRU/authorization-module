"""
Точка входа FastAPI-приложения.

Запуск:
    uvicorn main:app --reload
    uvicorn fastapi_auth.main:app --reload  (из корня проекта)

Swagger-документация:
    http://localhost:8000/docs
"""

from fastapi import FastAPI

# Импортируем наши модули
from config import settings
from database import engine, Base


# ═══════════════════════════════════════════════════════════════
# СОЗДАЁМ ПРИЛОЖЕНИЕ
# ═══════════════════════════════════════════════════════════════
fastapi_app = FastAPI(
    title="Auth API",                                       # название в Swagger
    description="Модуль авторизации (FastAPI + async)",     # описание в Swagger
    version="1.0.0",                                        # версия
)


# ═══════════════════════════════════════════════════════════════
# СОБЫТИЕ: СТАРТ ПРИЛОЖЕНИЯ
# ═══════════════════════════════════════════════════════════════
# @fastapi_app.on_event("startup") — аналог вызова seed_defaults() в create_app()
# Выполняется ОДИН раз при старте сервера
@fastapi_app.on_event("startup")
async def on_startup():
    """
    Создаёт таблицы при старте.

    Разбор конструкции:
    - async with engine.begin() as conn:
        асинхронно открывает соединение и начинает транзакцию

    - await conn.run_sync(Base.metadata.create_all):
        Base.metadata.create_all — СИНХРОННАЯ функция SQLAlchemy,
        которая создаёт все объявленные таблицы.
        run_sync запускает её в отдельном потоке, чтобы не блокировать
        event loop (об этом паттерне подробнее на этапе с LDAP).
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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