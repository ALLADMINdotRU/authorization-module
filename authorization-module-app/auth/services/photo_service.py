# ═══════════════════════════════════════════════════════════════
# auth/services/photo_service.py
# ═══════════════════════════════════════════════════════════════
"""
Сервис управления фотографиями пользователей.

Отвечает за:
- сохранение фото (сжатие в два размера + запись на диск)
- получение пути к файлу (с самовосстановлением, если файла нет)
- удаление фото
"""

import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from ..models import User
from ..utils import image

logger = logging.getLogger(__name__)


def _user_dir(user_id: int) -> Path:
    """Папка с фотографиями конкретного пользователя."""
    return Path(settings.PHOTO_UPLOAD_DIR) / str(user_id)


async def save_photo(db: AsyncSession, user: User, raw: bytes) -> None:
    """
    Сохранить фото: сжать в два размера и записать на диск.

    Args:
        db: сессия БД
        user: пользователь
        raw: сырые байты загруженного файла (уже обрезанный фронтом квадрат)

    Raises:
        ValueError: если файл не изображение или слишком большой
    """
    # ── 1. Открываем и проверяем ──
    img = image.open_and_validate(raw, settings.PHOTO_MAX_SIZE_MB * 1024 * 1024)

    # ── 2. Сжимаем в два размера ──
    avatar = image.make_avatar(img, settings.PHOTO_AVATAR_SIZE, settings.PHOTO_AVATAR_QUALITY)
    profile = image.make_profile(img, settings.PHOTO_PROFILE_SIZE, settings.PHOTO_PROFILE_QUALITY)

    # ── 3. Записываем на диск ──
    folder = _user_dir(user.id)
    folder.mkdir(parents=True, exist_ok=True)      # создаём папку, если её нет
    (folder / "avatar.webp").write_bytes(avatar)
    (folder / "profile.webp").write_bytes(profile)

    # ── 4. Обновляем метку в БД ──
    user.mark_photo_updated()
    await db.commit()

    logger.info("Фото пользователя '%s' (id=%s) сохранено", user.username, user.id)


async def get_photo_path(db: AsyncSession, user: User, size: str) -> Path | None:
    """
    Вернуть путь к файлу фото (или None, если файла нет).

    Если файла на диске нет, но в БД отмечено фото — сбрасываем
    метку в None (самовосстановление: БД и диск снова согласованы).

    Args:
        db: сессия БД
        user: пользователь
        size: "avatar" или "profile"

    Returns:
        Path — путь к файлу, или None
    """
    path = _user_dir(user.id) / f"{size}.webp"

    if path.exists():
        return path

    # Файла нет, но в БД отмечено фото — сбрасываем метку
    if user.photo_updated_at is not None:
        user.clear_photo()
        await db.commit()
        logger.warning("Файл фото '%s' пользователя id=%s отсутствует — метка сброшена", size, user.id)

    return None


async def delete_photo(db: AsyncSession, user: User) -> None:
    """
    Удалить оба файла фото и сбросить метку.

    Args:
        db: сессия БД
        user: пользователь
    """
    folder = _user_dir(user.id)
    for name in ("avatar.webp", "profile.webp"):
        (folder / name).unlink(missing_ok=True)    # удалить файл (если существует)

    user.clear_photo()
    await db.commit()

    logger.warning("Фото пользователя '%s' (id=%s) удалено", user.username, user.id)