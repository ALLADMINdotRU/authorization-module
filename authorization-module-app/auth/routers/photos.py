# ═══════════════════════════════════════════════════════════════
# auth/routers/photos.py
# ═══════════════════════════════════════════════════════════════
"""
Роут отдачи фотографий пользователей (для любых авторизованных).

Загрузка и удаление — в users.py (только админ),
а отдача — здесь (любой залогиненный: списки, карточки, другие сервисы).
"""
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_db
from ..models import User
from ..security import get_current_active_user
from ..services import user_service, photo_service
from ..exceptions import UserNotFound, PhotoNotFound


router = APIRouter(prefix="/users", tags=["photos"])


@router.get("/{user_id}/photo")
async def get_photo(
    user_id: int,
    size: str = "avatar",
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """
    Отдать фото пользователя.

    Args:
        user_id: id пользователя
        size: "avatar" (96×96) или "profile" (512×512)

    Доступно любому авторизованному пользователю (не только админу).
    """
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise UserNotFound(user_id)

    path = await photo_service.get_photo_path(db, user, size)
    if not path:
        raise PhotoNotFound()

    return FileResponse(path, media_type="image/webp")