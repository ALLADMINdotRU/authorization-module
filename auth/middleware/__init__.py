# ═══════════════════════════════════════════════════════════════
# auth/middleware/__init__.py
# ═══════════════════════════════════════════════════════════════
"""
Middleware модуля авторизации.
"""

from .rate_limit import limiter, configure_rate_limiting, setup_rate_limiting

__all__ = ["limiter", "configure_rate_limiting", "setup_rate_limiting"]
