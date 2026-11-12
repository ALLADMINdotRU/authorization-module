# ═══════════════════════════════════════════════════════════════
# auth/utils/image.py
# ═══════════════════════════════════════════════════════════════
"""
Утилиты обработки изображений (Pillow).

Здесь: открытие, валидация, обрезка и сжатие изображений.
Функции «чистые» — принимают размеры/качество параметрами,
чтобы не зависеть от настроек (их передаст photo_service).
"""
import io

from PIL import Image


def open_and_validate(raw: bytes, max_bytes: int) -> Image.Image:
    """
    Открыть изображение из байтов и проверить его.

    Args:
        raw: сырые байты загруженного файла
        max_bytes: максимально допустимый размер файла (в байтах)

    Returns:
        Image.Image — открытое изображение

    Raises:
        ValueError: если файл слишком большой или это не изображение
    """
    # ── 1. Проверяем размер ──
    if len(raw) > max_bytes:
        raise ValueError(f"Файл слишком большой (лимит  {max_bytes // (1024 * 1024)} MB)")

    # ── 2. Пробуем открыть как изображение ──
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()      # заставляем Pillow прочитать файл целиком (тут поймаем ошибку)
    except Exception:
        raise ValueError("Файл не является изображением")

    return img


def _to_square(img: Image.Image, size: int) -> Image.Image:
    """
    Обрезать до квадрата по центру и уменьшить до size×size.

    Args:
        img: исходное изображение
        size: целевой размер стороны квадрата (px)

    Returns:
        Image.Image — квадратное изображение size×size
    """
    w, h = img.size                 # текущие ширина и высота

    side = min(w, h)                # сторона квадрата = меньшая из сторон
    left = (w - side) // 2          # отступ слева (центрируем)
    top = (h - side) // 2           # отступ сверху (центрируем)

    img = img.crop((left, top, left + side, top + side))   # вырезаем квадрат
    return img.resize((size, size), Image.LANCZOS)         # масштабируем до size×size


def make_avatar(img: Image.Image, size: int, quality: int) -> bytes:
    """
    Сделать аватар: квадрат size×size, WebP.

    Args:
        img: исходное изображение
        size: размер стороны (например 96)
        quality: качество WebP (0–100)

    Returns:
        bytes — готовый файл WebP
    """
    img = _to_square(img, size)     # гарантируем квадрат size×size
    buf = io.BytesIO()              # буфер в памяти (вместо файла на диске)
    img.save(buf, format="WEBP", quality=quality)
    return buf.getvalue()           # достаём байты


def make_profile(img: Image.Image, size: int, quality: int) -> bytes:
    """
    Сделать фото профиля: вписать в size×size, сохраняя пропорции, WebP.

    Args:
        img: исходное изображение
        size: максимальный размер (например 512)
        quality: качество WebP (0–100)

    Returns:
        bytes — готовый файл WebP
    """
    img.thumbnail((size, size), Image.LANCZOS)   # вписывает, НЕ искажая пропорции
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=quality)
    return buf.getvalue()