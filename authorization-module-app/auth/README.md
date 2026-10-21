# Модуль авторизации `auth` (FastAPI, async)

Переносимый модуль для аутентификации пользователей (локальная и LDAP), управления пользователями, ролями и LDAP-серверами.

Особенности:
- Полностью асинхронный (async SQLAlchemy + asyncpg)
- JWT-аутентификация (вместо сессий)
- Паттерн «расширение» — модуль не зависит от структуры проекта
- Автодокументация Swagger

---

## Требования

- Python 3.10+
- PostgreSQL

Зависимости:

```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
pydantic-settings
python-jose[cryptography]
bcrypt
python-multipart
ldap3
cryptography
email-validator
```

Установка:

```bash
pip install fastapi uvicorn[standard] "sqlalchemy[asyncio]" asyncpg pydantic-settings "python-jose[cryptography]" bcrypt python-multipart ldap3 cryptography email-validator
```


---

## Подключение к проекту

### 1. Скопировать модуль

Скопировать папку `auth/` в корень вашего FastAPI-проекта.

### 2. `.env`

Добавить переменные:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/db_name
SECRET_KEY=your-secret-key
ENCRYPTION_KEY=<сгенерировать: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

### 3. Создать корневые файлы

**`config.py`:**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str                           # строка подключения к PostgreSQL
    SECRET_KEY: str                             # ключ для подписи JWT-токенов
    ENCRYPTION_KEY: str                         # ключ для шифрования LDAP-паролей в БД
    JWT_ALGORITHM: str = "HS256"                # алгоритм подписи (HS256 = HMAC+SHA256)
    JWT_EXPIRE_MINUTES: int = 60                # время жизни токена в минутах
    LOG_LEVEL: str = "INFO"                     # DEBUG, INFO, WARNING, ERROR

    model_config = {                            # model_config говорит Pydantic откуда читать переменные
        "env_file": ".env",                     # читать из файла .env
        "env_file_encoding": "utf-8",           # кодировка файла
    }

settings = Settings()
```

**`database.py`:**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as db:
        yield db
```

**`main.py`:**

```python
from fastapi import FastAPI

from config import settings
from database import engine, get_db, AsyncSessionLocal

from auth import AuthModule
from auth.models import Base as AuthBase
from auth.seed import seed_defaults

app = FastAPI(title="My App")

@app.on_event("startup")
async def on_startup():
    # Создаём таблицы модуля
    async with engine.begin() as conn:
        await conn.run_sync(AuthBase.metadata.create_all)

    # Seed: роли и админ
    async with AsyncSessionLocal() as db:
        await seed_defaults(db)

# Подключаем модуль
auth_module = AuthModule()
auth_module.init_app(app=app, settings=settings, get_db=get_db)
app.include_router(auth_module.router)
```

### 4. Запуск

```bash
uvicorn main:app --reload
```

Swagger: `http://localhost:8000/docs`

### 5. Учётные данные по умолчанию

- Логин: `admin`
- Пароль: `admin`

---

## Маршруты

### 🔓 Открытые

| URL | Метод | Описание |
|-----|-------|----------|
| `/auth/token` | POST | Вход (form-data: username, password) → JWT-токен |

### 🔒 Требуется токен

| URL | Метод | Описание |
|-----|-------|----------|
| `/auth/me` | GET | Профиль текущего пользователя |

### 🛡️ Требуется роль admin

| URL | Метод | Описание |
|-----|-------|----------|
| `/auth/admin/users` | GET, POST | Список / создание пользователей |
| `/auth/admin/users/{id}` | GET, PATCH, DELETE | Пользователь |
| `/auth/admin/roles` | GET, POST | Список / создание ролей |
| `/auth/admin/roles/{id}` | GET, PATCH, DELETE | Роль |
| `/auth/admin/ldap-servers` | GET, POST | Список / создание серверов |
| `/auth/admin/ldap-servers/{id}` | GET, PATCH, DELETE | Сервер |
| `/auth/admin/ldap-servers/{id}/test` | POST | Проверка подключения |

---

## Как войти через Swagger

1. Открыть `/docs`
2. Найти `POST /auth/token` → **Try it out**
3. Ввести `admin` / `admin`
4. Скопировать `access_token`
5. Нажать **Authorize** (справа сверху) → вставить токен
6. Теперь защищённые роуты доступны

---

## Структура модуля

```
auth/
├── __init__.py       # AuthModule (паттерн "расширение")
├── models.py         # User, Role, LDAPServer
├── schemas.py        # Pydantic-схемы
├── security.py       # JWT, get_current_user, admin_required
├── deps.py           # "мост" для get_db
├── seed.py           # роли и админ при старте
├── ldap/             # LDAP-библиотека (синхронная, без Flask)
├── services/         # async бизнес-логика
├── routers/          # APIRouter'ы
└── utils/            # encryption.py (Fernet)
```

---

## Ключевые паттерны

### 1. Паттерн «расширение»

Модуль не импортирует ничего из корневого проекта. Всё нужное корень передаёт через `init_app()`:

```python
auth_module.init_app(app, settings, get_db)
```

### 2. Внедрение зависимостей через Depends

```python
async def my_route(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    admin: User = Depends(admin_required),
):
    ...
```

### 3. async SQLAlchemy

- Все запросы: `await db.execute(select(...))`
- Связи грузить явно: `.options(selectinload(User.roles))`
- Коммит асинхронный: `await db.commit()`

### 4. LDAP обёрнут в run_in_executor

LDAP-библиотека синхронная, поэтому её вызовы оборачиваются в потоки, чтобы не блокировать event loop.

---

## Переход на другой проект

Модуль полностью переносимый — просто скопируй папку `auth/` и вызови `init_app()` в новом проекте. Никаких правок внутри модуля не требуется.
