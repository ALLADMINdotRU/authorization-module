Markdown Markdown # Логирование в модуле auth

## 1. Общие понятия

| Понятие | Что это | Пример |
|---------|---------|--------|
| **Логгер (logger)** | именованный «канал» для сообщений | `logging.getLogger("auth")` |
| **Обработчик (handler)** | куда писать — консоль или файл | `StreamHandler`, `FileHandler` |
| **Уровень (level)** | порог важности (что писать) | `DEBUG`, `INFO`, `WARNING` |
| **Форматтер (formatter)** | как выглядит строка лога | `время | уровень | имя | сообщение` |

## 2. Уровни логирования

| Уровень | Число | Назначение |
|---------|-------|-----------|
| `DEBUG` | 10 | отладочные детали |
| `INFO` | 20 | события («пользователь создан») |
| `WARNING` | 30 | подозрительное («неверный токен») |
| `ERROR` | 40 | ошибка («не удалось подключиться») |
| `CRITICAL` | 50 | критический сбой |

Если уровень = `INFO`, выводятся `INFO` и важнее. `DEBUG` — нет.

## 3. Где что настраивается

| Файл | Что делает |
|------|-----------|
| `config.py` | хранит `LOG_LEVEL` (читается из `.env`) |
| `main.py` | `basicConfig` — настраивает **root** (уровень + консоль/файл) |
| `auth/__init__.py` | в `init_app` вызывает `setup_logging(level)` |
| `auth/logging_config.py` | задаёт **уровень** логгеру `auth` |
| `auth/services/*.py` | создают `logger` и пишут сообщения |

## 4. Иерархия логгеров

```
root                          ← main.py (basicConfig)
  └── auth                    ← logging_config.py (setup_logging)
        ├── auth.services.user_service
        ├── auth.services.ldap_service
        └── auth.routers.users
```

`__name__` в каждом файле даёт имя вида `auth.services.user_service`,
которое автоматически входит в дерево под `auth`.

## 5. Как сообщение «путешествует»

```
logger.debug("...")  в сервисе (auth.services.xxx)
        ↓  (своих обработчиков нет)
auth  — проверяется УРОВЕНЬ (фильтр)
        ↓  (propagate=True)
root  — здесь ОБРАБОТЧИКИ (консоль + файл)
        ↓
выводится в консоль и logs/app.log
```

## 6. Как включить DEBUG

1. В `.env` → `LOG_LEVEL=DEBUG`.
2. В `main.py` → `basicConfig(level=logging.DEBUG)` (или из settings).

⚠️ Если `auth` на DEBUG, но **root на INFO** — DEBUG отрежется на root.

## 7. Полный путь ошибки (пример LDAP)

```
1. Ошибка возникает в _authenticate_ldap_sync (LDAPConnectionError)
2. logger.warning("LDAP-аутентификация не удалась: ...")
3. логгер "auth.services.ldap_service" (своих обработчиков нет)
4. поднимается к "auth" (уровень: WARNING >= INFO → проходит)
5. поднимается к root (обработчики: консоль + файл)
6. выводится в консоль и logs/app.log
```

## 8. Главные правила

1. `logging.getLogger(__name__)` — один логгер на файл, имя = путь.
2. Уровень решает «что писать», обработчик — «куда писать».
3. root на INFO перекрывает DEBUG — для DEBUG root тоже нужен DEBUG.
