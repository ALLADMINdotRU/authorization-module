# ═══════════════════════════════════════════════════════════════
# auth/exceptions.py
# ═══════════════════════════════════════════════════════════════
"""
Бизнес-ошибки модуля авторизации.

Здесь описаны ВСЕ «ожидаемые» ошибки модуля (пользователь существует,
не найден, нет прав и т.д.) в виде кастомных классов-исключений.

Зачем это нужно:
1. У каждой ошибки есть понятный ТЕКСТ (detail) — что показать пользователю.
2. У каждой ошибки есть ТИП (type) и КОД (code) — чтобы фронтенд мог
   строить логику, не парся русский текст.
3. У каждой ошибки есть HTTP-статус (status_code) — 400/404/401/403.

Глобальный обработчик в этом же файле превращает такую ошибку в JSON:
    {"detail": "...", "type": "...", "code": "..."}
"""



from fastapi import Request                                                     # Request — тип запроса (нужен в сигнатуре обработчика).
from fastapi.responses import JSONResponse                                      # JSONResponse — класс для возврата ответа в формате JSON.


# ═══════════════════════════════════════════════════════════════
# БАЗОВЫЙ КЛАСС ОШИБКИ
# ═══════════════════════════════════════════════════════════════

class AuthError(Exception):
    """
    Базовое бизнес-исключение модуля. Все остальные наследуются от него.

    Почему важно: обработчик ловит ТОЛЬКО этот класс (и его потомков).
    Ошибки других модулей (у них другие классы) сюда не попадут.
    """

    # Значения по умолчанию (подклассы могут переопределить)
    status_code = 400     # HTTP-статус ответа
    code = "error"        # машиночитаемый код

    def __init__(self, detail: str, *, status_code: int | None = None, code: str | None = None):
        """
        Args:
            detail: человекочитаемый текст ошибки (для пользователя)
            status_code: HTTP-статус (400/404/...). Если None — берём из класса
            code: короткий стабильный код ("user_not_found"). Если None — из класса
        """
        self.detail = detail
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code
        # type = имя класса, например "UserAlreadyExists".
        # type(self).__name__ — берём имя класса текущего объекта.
        self.type = type(self).__name__


# ═══════════════════════════════════════════════════════════════
# ОШИБКИ, СВЯЗАННЫЕ С ПОЛЬЗОВАТЕЛЯМИ
# ═══════════════════════════════════════════════════════════════

class UserAlreadyExists(AuthError):
    """Пользователь с таким username/email уже есть."""
    def __init__(self, username: str):
        super().__init__(
            detail=f"Пользователь '{username}' уже существует",
            status_code=400,
            code="user_already_exists",
        )


class UserNotFound(AuthError):
    """Пользователь с таким id не найден."""
    def __init__(self, user_id: int):
        super().__init__(
            detail=f"Пользователь с id={user_id} не найден",
            status_code=404,
            code="user_not_found",
        )


class InvalidCredentials(AuthError):
    """Неверный логин или пароль при входе."""
    def __init__(self):
        super().__init__(
            detail="Неверный логин или пароль",
            status_code=401,
            code="invalid_credentials",
        )


class InactiveUser(AuthError):
    """Пользователь заблокирован (неактивен)."""
    def __init__(self, username: str):
        super().__init__(
            detail=f"Пользователь '{username}' неактивен",
            status_code=400,
            code="inactive_user",
        )


class Unauthorized(AuthError):
    """Не авторизован (нет или неверный токен)."""
    def __init__(self):
        super().__init__(
            detail="Не удалось проверить учетные данные",
            status_code=401,
            code="unauthorized",
        )

        
class Forbidden(AuthError):
    """Недостаточно прав (не админ)."""
    def __init__(self):
        super().__init__(
            detail="Недостаточно прав (требуется роль admin)",
            status_code=403,
            code="forbidden",
        )


class UserNotDeleted(AuthError):
    """Попытка восстановить пользователя, который не был удалён."""
    def __init__(self, user_id: int):
        super().__init__(
            detail=f"Пользователь с id={user_id} не был удалён",
            status_code=400,
            code="user_not_deleted",
        )



# ═══════════════════════════════════════════════════════════════
# ОШИБКИ, СВЯЗАННЫЕ С РОЛЯМИ
# ═══════════════════════════════════════════════════════════════

class RoleAlreadyExists(AuthError):
    """Роль с таким именем уже есть."""
    def __init__(self, name: str):
        super().__init__(
            detail=f"Роль '{name}' уже существует",
            status_code=400,
            code="role_already_exists",
        )


class RoleNotFound(AuthError):
    """Роль с таким id не найдена."""
    def __init__(self, role_id: int):
        super().__init__(
            detail=f"Роль с id={role_id} не найдена",
            status_code=404,
            code="role_not_found",
        )


class RoleInUse(AuthError):
    """Роль назначена пользователям — нельзя удалить."""
    def __init__(self, name: str):
        super().__init__(
            detail=f"Роль '{name}' назначена пользователям и не может быть удалена",
            status_code=400,
            code="role_in_use",
        )



# ═══════════════════════════════════════════════════════════════
# ОШИБКИ, СВЯЗАННЫЕ С LDAP-СЕРВЕРАМИ
# ═══════════════════════════════════════════════════════════════

class LDAPServerAlreadyExists(AuthError):
    """LDAP-сервер с таким именем уже есть."""
    def __init__(self, name: str):
        super().__init__(
            detail=f"LDAP-сервер '{name}' уже существует",
            status_code=400,
            code="ldap_server_already_exists",
        )


class LDAPServerNotFound(AuthError):
    """LDAP-сервер с таким id не найден."""
    def __init__(self, server_id: int):
        super().__init__(
            detail=f"LDAP-сервер с id={server_id} не найден",
            status_code=404,
            code="ldap_server_not_found",
        )


# ═══════════════════════════════════════════════════════════════
# ОБРАБОТЧИК И РЕГИСТРАЦИЯ
# ═══════════════════════════════════════════════════════════════

async def auth_error_handler(request: Request, exc: AuthError):
    """
    Превращает бизнес-исключение AuthError в JSON-ответ.

    FastAPI вызывает эту функцию САМ, когда где-то происходит AuthError.

    Args:
        request: объект запроса (FastAPI передаёт автоматически, тут не используется)
        exc: само исключение (объект AuthError с полями detail/type/code/status_code)
    """
    return JSONResponse(
        status_code=exc.status_code,     # HTTP-статус (400/404/...)
        content={
            "detail": exc.detail,        # текст для пользователя
            "type": exc.type,            # имя класса ("UserAlreadyExists")
            "code": exc.code,            # код ("user_already_exists")
        },
    )


def register_error_handlers(app):
    """
    Подключает обработчик AuthError к приложению.

    Вызывается в AuthModule.init_app().

    app.add_exception_handler(AuthError, auth_error_handler) значит:
    «когда произойдёт исключение типа AuthError — вызови auth_error_handler».
    """
    app.add_exception_handler(AuthError, auth_error_handler)