# ═══════════════════════════════════════════════════════════════
# auth/middleware/rate_limit.py
# ═══════════════════════════════════════════════════════════════
"""
Rate limiting (защита от брутфорса) через slowapi.

Всё настраивается через settings (передаются из корня в init_app):
- лимиты      → RATE_LIMIT_LOGIN, RATE_LIMIT_DEFAULT
- хранилище   → RATE_LIMIT_STORAGE_URI
- ключ        → RATE_LIMIT_KEY_FUNC  ("ip" | "username" | "ip+username")

Ключевая идея:
- limit_value и key_func у slowapi — это callable, которые вызываются
  в РАНТАЙМЕ (при каждом запросе), поэтому они читают актуальные
  настройки из глобальной _config.
- storage_uri фиксируется при СОЗДАНИИ Limiter, поэтому сам limiter
  создаётся в configure_rate_limiting() уже после получения settings.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ═══════════════════════════════════════════════════════════════
# ГЛОБАЛЬНАЯ КОНФИГУРАЦИЯ (заполняется из settings в configure)
# ═══════════════════════════════════════════════════════════════
_config = {
    "enabled": True,
    "storage_uri": "memory://",
    "default_limit": "1000/hour",
    "login_limit": "5/minute",
    "key_func_name": "ip",   # "ip" | "username" | "ip+username"
}

# limiter создаётся в configure_rate_limiting() (нужны settings для storage_uri)
limiter = None


# ═══════════════════════════════════════════════════════════════
# KEY FUNC — по какому ключу отслеживать брутфорс
# ═══════════════════════════════════════════════════════════════
def _get_key(request):
    """
    Возвращает ключ для rate limiting в зависимости от настройки.

    - "ip"          → IP-адрес клиента
    - "username"    → логин из заголовка X-Username (fallback на IP)
    - "ip+username" → "IP:логин" (защита от распределённого брутфорса)
    """
    name = _config["key_func_name"]
    ip = get_remote_address(request)

    if name == "username":
        return request.headers.get("X-Username") or ip
    if name == "ip+username":
        username = request.headers.get("X-Username")
        return f"{ip}:{username}" if username else ip
    return ip  # "ip" по умолчанию


# ═══════════════════════════════════════════════════════════════
# LIMIT VALUE — callable, читает лимит из настроек в рантайме
# ═══════════════════════════════════════════════════════════════
def get_login_limit() -> str:
    """Возвращает строку лимита для /login из настроек."""
    return _config["login_limit"]


# ═══════════════════════════════════════════════════════════════
# НАСТРОЙКА — вызывается корнем через setup_rate_limiting()
# ═══════════════════════════════════════════════════════════════
def configure_rate_limiting(settings):
    """
    Сохраняет настройки и создаёт limiter.

    Args:
        settings: настройки приложения (Pydantic Settings)
    """
    global limiter

    _config["enabled"] = settings.RATE_LIMIT_ENABLED
    _config["storage_uri"] = settings.RATE_LIMIT_STORAGE_URI
    _config["default_limit"] = settings.RATE_LIMIT_DEFAULT
    _config["login_limit"] = settings.RATE_LIMIT_LOGIN
    _config["key_func_name"] = settings.RATE_LIMIT_KEY_FUNC

    limiter = Limiter(
        key_func=_get_key,
        default_limits=[_config["default_limit"]],
        storage_uri=_config["storage_uri"],
    )


def setup_rate_limiting(app, settings):
    """
    Регистрирует rate limiting в FastAPI-приложении.

    Вызывается из AuthModule.init_app().

    Args:
        app: экземпляр FastAPI
        settings: настройки приложения
    """
    configure_rate_limiting(settings)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)