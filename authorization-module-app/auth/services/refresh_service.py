# ═══════════════════════════════════════════════════════════════
# auth/services/refresh_service.py
# ═══════════════════════════════════════════════════════════════
"""
Сервис refresh-токенов.

Логика:
1. При логине создаём refresh-токен → в БД сохраняем его ХЭШ, клиенту отдаём САМ токен.
2. При /refresh проверяем: токен существует, не отозван, не истёк.
3. При logout отзываем токен (revoked=True).

ВАЖНО: в БД хранится только хэш токена (sha256), а не сам токен.
Если БД утечёт — злоумышленник получит хэши, а не рабочие токены.
"""

import hashlib
import secrets
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import RefreshToken, utc_now


def generate_refresh_token() -> str:
    """
    Генерирует случайный refresh-токен.

    secrets.token_urlsafe(32) — криптографически безопасная случайная
    строка (около 43 символов). Её невозможно угадать.
    """
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """
    Хэширует токен (sha256).

    Возвращает 64-символьную hex-строку. Именно её мы храним в БД.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_refresh_token(db: AsyncSession, user_id: int, expire_days: int = 7) -> str:
    """
    Создаёт refresh-токен для пользователя.

    Args:
        db: сессия БД
        user_id: id пользователя
        expire_days: срок жизни токена в днях

    Returns:
        САМ токен (случайная строка) — её нужно отдать клиенту в cookie.
        В БД при этом сохраняется только хэш.
    """
    token = generate_refresh_token()

    rt = RefreshToken(
        user_id=user_id,
        token_hash=hash_token(token),                              # храним хэш, не токен
        expires_at=utc_now() + timedelta(days=expire_days),        # срок жизни
    )

    db.add(rt)
    await db.commit()

    return token  # возвращаем сам токен (клиенту)


async def verify_refresh_token(db: AsyncSession, token: str) -> int | None:
    """
    Проверяет refresh-токен.

    Returns:
        user_id — если токен валиден, иначе None.
    """
    token_hash = hash_token(token)

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    rt = result.scalar_one_or_none()

    # 1. Токена нет в БД
    if not rt:
        return None

    # 2. Токен отозван
    if rt.revoked:
        return None

    # 3. Токен истёк
    if rt.expires_at <= utc_now():
        return None

    return rt.user_id


async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
    """
    Отзывает refresh-токен (помечает revoked=True).

    Используется при logout. После этого токен больше не сработает,
    даже если срок ещё не истёк.
    """
    token_hash = hash_token(token)

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    rt = result.scalar_one_or_none()

    if rt:
        rt.revoked = True
        rt.revoked_at = utc_now()
        await db.commit()