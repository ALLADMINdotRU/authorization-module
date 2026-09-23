# ═══════════════════════════════════════════════════════════════
# auth/logging_config.py
# ═══════════════════════════════════════════════════════════════
"""
Логирование модуля auth (внутреннее, не трогает root-логгер корня).

Логгер: "auth". Все дочерние логгеры (auth.services.*, auth.routers.*)
наследуют эти настройки.

Куда пишем:
- консоль → для программиста (DEBUG и выше)
- файл   → для админа (INFO и выше, с ротацией)
"""

import logging
import os
from logging.handlers import RotatingFileHandler                                # RotatingFileHandler — обработчик, который пишет в файл и "ротирует" его


def setup_logging(level: str = "INFO", log_dir: str = "logs"):
    """
    Настраивает логгер "auth".

    Вызывается в AuthModule.init_app().

    Args:
        level: "DEBUG" | "INFO" | "WARNING" | "ERROR" (из settings.LOG_LEVEL)
        log_dir: папка для файлов журнала
    """

    logger = logging.getLogger("auth")                                          # Получаем (или создаём) логгер с именем "auth"
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))              # Задаём уровень логирования, по умолчанию INFO
    logger.propagate = False                                                    # Отключаем передачу сообщений в корневой логгер

    formatter = logging.Formatter(                                              # Формат строки лога
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",               # %(asctime)s → дата и время # %(levelname)-8s → уровень, выровненный до 8 символов # %(name)s → имя логгера (например auth.services.user_service) # %(message)s → само сообщение
        datefmt="%Y-%m-%d %H:%M:%S",                                            # datefmt задаёт формат даты.
    )

    # Обработчик №1: КОНСОЛЬ (для программиста) ──
    # StreamHandler() по умолчанию пишет в stdout (консоль).
    # setLevel(DEBUG) → в консоль выводим ВСЁ (даже DEBUG), чтобы программист
    # видел максимум деталей при отладке.
    console = logging.StreamHandler()
    console.setLevel(logging.DEBUG)
    console.setFormatter(formatter)
    logger.addHandler(console)   # прикрепляем обработчик к логгеру

    # Обработчик №2: ФАЙЛ (для админа) ──
    # Создаём папку для логов, если её ещё нет.
    # exist_ok=True → не ругаться, если папка уже существует.
    os.makedirs(log_dir, exist_ok=True)

    file_handler = RotatingFileHandler(                                         
        os.path.join(log_dir, "auth.log"),                                      # RotatingFileHandler пишет в файл logs/auth.log.
        maxBytes=5_000_000,                                                     #   maxBytes=5_000_000 → 5 МБ (когда файл достигнет этого размера — ротация)
        backupCount=5,                                                          #   backupCount=5      → хранить 5 старых файлов: auth.log.1 ... auth.log.5
        encoding="utf-8",                                                       #   encoding="utf-8"   → чтобы русский текст в логах читался корректно
    )
    
    file_handler.setLevel(logging.INFO)                                         # setLevel(INFO) → в файл пишем только INFO и важнее.
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)