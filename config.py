"""
Конфигурация приложения через Pydantic BaseSettings.

BaseSettings автоматически читает переменные из .env файла.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Настройки приложения.

    Каждое поле = одна переменная из .env.
    Если переменная не указана в .env — используется значение по умолчанию.
    """

    # ── База данных ──
    DATABASE_URL: str                                # строка подключения к PostgreSQL

    # ── Безопасность ──
    SECRET_KEY: str                                  # ключ для подписи JWT-токенов
    ENCRYPTION_KEY: str                              # ключ для шифрования LDAP-паролей в БД

    # ── JWT-токены ──
    JWT_ALGORITHM: str = "HS256"                     # алгоритм подписи (HS256 = HMAC+SHA256)
    JWT_EXPIRE_MINUTES: int = 60                     # время жизни токена в минутах

    # ── Логирование ──
    LOG_LEVEL: str = "INFO"                          # DEBUG, INFO, WARNING, ERROR

    # ── Настройки Pydantic ──
    # model_config говорит Pydantic откуда читать переменные
    model_config = {
        "env_file": ".env",                          # читать из файла .env
        "env_file_encoding": "utf-8",                # кодировка файла
    }

# Создаём ОДИН экземпляр настроек — он будет использоваться везде
# (аналог app.config в Flask, но с автодополнением в IDE!)
settings = Settings()