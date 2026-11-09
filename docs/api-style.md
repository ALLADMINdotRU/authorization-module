# Стиль API (структура ответов на фронтенд)

## 1. Два вида ответов

| Вид | Как оформляется | Где |
|-----|-----------------|-----|
| **Успех** | Pydantic-схема + `response_model` | `auth/schemas.py` |
| **Ошибка** | Исключение `AuthError` | `auth/exceptions.py` |

## 2. Ошибки — через `AuthError`

Каждая «ожидаемая» ошибка — класс-исключение, наследник `AuthError`
(в `auth/exceptions.py`). У ошибки 4 поля:

| Поле | Что это | Пример |
|------|---------|--------|
| `detail` | текст для пользователя | `"Пользователь 'x' уже существует"` |
| `type` | имя класса | `"UserAlreadyExists"` |
| `code` | машиночитаемый код (для логики фронта) | `"user_already_exists"` |
| `status_code` | HTTP-статус | `400` |

### Глобальный обработчик

`auth_error_handler` (в `exceptions.py`) превращает исключение в JSON:

```json
{
  "detail": "Пользователь 'x' уже существует",
  "type": "UserAlreadyExists",
  "code": "user_already_exists"
}
```

Регистрируется через `register_error_handlers(app)` в `init_app()`.

## 3. Как добавить новую ошибку

В `auth/exceptions.py` создать класс:

```python
class LDAPConnectionFailed(AuthError):
    def __init__(self, detail: str):
        super().__init__(
            detail=detail,
            status_code=400,
            code="ldap_connection_failed",
        )
```

И в сервисе/роуте бросать его:

```python
if not ok:
    raise LDAPConnectionFailed("Не удалось подключиться к ...")
```

## 4. Успешные ответы — через `response_model`

Данные описываются Pydantic-схемами (`auth/schemas.py`) и указываются
в декораторе роута:

```python
@router.get("", response_model=Page[UserAdminRead])        # список
@router.post("", response_model=UserRead, status_code=201)  # создание
```

Примеры схем: `UserRead`, `RoleRead`, `LDAPServerRead`, `Page[...]`, `Token`.

## 5. Как фронт читает ошибки

В `authorization-module-ui/src/shared/api/baseApi.ts`:

```ts
if (data && typeof data === "object" && "detail" in data) {
  const detail = data.detail
  if (typeof detail === "string") {
    dispatch(showNotification({ message: detail, severity: "error" }))
  }
}
```

Фронт берёт поле **`detail`** из ответа ошибки и показывает его в уведомлении.
Поэтому в ошибках важно класть понятный текст именно в `detail`.

## 6. Главные правила

1. Ошибка → бросать `AuthError` (не возвращать `{"success": false}`).
2. Успех → `response_model` + Pydantic-схема.
3. Текст для пользователя — в поле `detail`.
4. Код для логики фронта — в поле `code` (snake_case).
