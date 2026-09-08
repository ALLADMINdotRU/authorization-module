# ═══════════════════════════════════════════════════════════════
# БЛОК 1: ИМПОРТЫ
# ═══════════════════════════════════════════════════════════════

from ldap3 import Server, Connection, ALL                                   # ALL — флаг "получить всю информацию о сервере" при подключении
from ldap3.core.exceptions import LDAPBindError                             # Импортируем стандартное LDAPBindError из ldap3 Это исключение кидается когда логин/пароль неверные
import logging
from .config import LDAPConfig
from .exceptions import LDAPConnectionError, LDAPBindError                  # Импортируем наши собственные исключения

logger = logging.getLogger(__name__)                                        # Создаём логгер для этого модуля  __name__ — это "app.auth.ldap.connection" Логгер будет писать сообщения с этим префиксом

class LDAPConnection:
    """
    Управление соединением с LDAP-сервером.

    Отвечает строго за транспорт:
    - открыть соединение (connect)
    - закрыть соединение (disconnect)
    - контекстный менеджер (with)
    """

    def __init__(self, config: LDAPConfig):
        config.validate()                                                   # валидируем конфиг (проверяем что server_url и base_dn не пустые)
        self.config = config                                                # сохраняем конфиг в объект
        self._connection = None                                             # здесь будет объект Connection из ldap3

    # Метод connect() — устанавливает соединение
    def connect(self):
        if self._connection and self._connection.bound:
            logger.debug("Соединение с LDAP уже установлено")
            return
        try:
            scheme = "ldaps://" if self.config.use_ssl else "ldap://"       # ssl или нет
            server_url = f"{scheme}{self.config.server_url}"                # Например: "ldap://dc01.domain.local"
            server = Server(server_url, get_info=ALL)                       # Создаём объект Server из ldap3 get_info=ALL — запрашиваем у сервера всю мета-информацию

            # Создаём Connection и сразу делаем bind (авторизацию)
            self._connection = Connection(
                server,
                user=self.config.user,
                password=self.config.password,
                auto_bind=True
            )

            logger.info(f"Соединение с LDAP установлено: {server_url}")

        except LDAPBindError:
            raise LDAPBindError(                                            # Оборачиваем в НАШЕ исключение LDAPBindError
                f"Неверные учетные данные для подключения к {self.config.server_url}"
            )
        # Ловим все остальные ошибки (сервер недоступен, таймаут, DNS и т.д.)
        except Exception as e:
            raise LDAPConnectionError(
                f"Не удалось подключиться к {self.config.server_url}: {e}"
            )

    # Метод disconnect() — закрывает соединение
    def disconnect(self):
        if self._connection:
            self._connection.unbind()  
            logger.debug("Соединение с LDAP закрыто")
            self._connection = None                                         # обнуляем, чтобы is_connected вернул False

    # ══════════════════════════════════════════════════════════
    # КОНТЕКСТНЫЙ МЕНЕДЖЕР (with ... as ...)
    # ══════════════════════════════════════════════════════════

    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
        return False  # не подавляем исключения
    
    
    # ══════════════════════════════════════════════════════════
    # СВОЙСТВО
    # ══════════════════════════════════════════════════════════
    # Строка 20: Свойство is_connected — можно узнать статус без прямого доступа к _connection
    # @property — синтаксический сахар, позволяет писать conn.is_connected вместо conn.is_connected()
    @property
    def is_connected(self) -> bool:
        return self._connection is not None and self._connection.bound