# ═══════════════════════════════════════════════════════════════
# auth/__init__.py
# ═══════════════════════════════════════════════════════════════
"""
Модуль авторизации (переносимый, FastAPI + async).

Подключение (в main.py корневого проекта):

    from auth import AuthModule

    auth_module = AuthModule()
    auth_module.init_app(app, settings=settings, get_db=get_db)
    app.include_router(auth_module.router)
"""

from fastapi import APIRouter

# Импортируем «мост» для зависимостей
from . import deps, security

# Импортируем модели — чтобы их metadata был доступен корню
from . import models  # 

# Rate limiting (настраивается в init_app из settings)
from .middleware.rate_limit import setup_rate_limiting

class AuthModule:
    """
    Класс-обёртка модуля авторизации.

    Это паттерн «расширение» (аналог Flask-extension):
    - модуль не импортирует ничего из корня
    - корень передаёт модулю всё нужное через init_app()
    """

    def __init__(self):
        # Главный роутер модуля. Все эндпоинты будут под префиксом /auth
        self.router = APIRouter(prefix="/auth")
        # Флаг: был ли вызван init_app (защита от ошибок)
        self._initialized = False

    def init_app(self, app, settings, get_db):
        """
        Инициализирует модуль. Вызывается корнем при старте.

        Args:
            app: экземпляр FastAPI
            settings: настройки приложения (Pydantic Settings)
            get_db: корневая асинхронная зависимость сессии БД

        Что здесь происходит (порядок ВАЖЕН):
        1. Сохраняем настройки и зависимость сессии
        2. Передаём get_db в «мост» (deps.py)
        3. Передаём JWT-настройки
        4. Настраиваем rate limiting (создаёт limiter из settings)
        5. Импортируем роутеры ПОСЛЕ настройки rate limiting
        6. Подключаем роутеры
        """
        self.app = app
        self.settings = settings

        # Кладём корневую get_db в «мост», чтобы роутеры могли её взять
        deps.set_get_db(get_db)

        # передаём JWT-настройки
        security.configure_jwt(
            secret_key=settings.SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
            expire_minutes=settings.JWT_EXPIRE_MINUTES,
        )

        # Настраиваем rate limiting (защита от брутфорса)
        setup_rate_limiting(app, settings)

        # Импортируем роутеры ПОСЛЕ настройки rate limiting
        # (декораторы @limiter.limit() в них должны видеть готовый limiter)
        from .routers import auth, users, roles, ldap_servers

        # Подключаем роутеры модуля
        self.router.include_router(auth.router)
        self.router.include_router(users.router)
        self.router.include_router(roles.router)
        self.router.include_router(ldap_servers.router)
        
        self._initialized = True

    @property
    def is_initialized(self) -> bool:
        """Проверка: вызван ли init_app."""
        return self._initialized