# ═══════════════════════════════════════════════════════════════
# БЛОК 1: ИМПОРТЫ
# ═══════════════════════════════════════════════════════════════
import base64                                                               # base64 — понадобится для кодирования фото (thumbnailPhoto) в строку
from datetime import datetime, timezone                                     # datetime, timezone — для преобразования whenCreated/whenChanged
import logging
from .connection import LDAPConnection                                      # Импортируем НАШ LDAPConnection
from .exceptions import LDAPSearchError                                     # Импортируем НАШЕ исключение для ошибок поиска

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# БЛОК 2: КОНСТАНТА — атрибуты по умолчанию
# ═══════════════════════════════════════════════════════════════
# Вынесли список атрибутов в константу.
DEFAULT_ATTRIBUTES = [
    'sAMAccountName', 
    'cn', 
    'mail', 
    'telephoneNumber', 
    'mobile',
    'title', 
    'ipPhone', 
    'department', 
    'thumbnailPhoto', 
    'objectGUID',
    'whenCreated', 
    'whenChanged', 
    'pager', 
    'facsimileTelephoneNumber',
    'company', 
    'givenName', 
    'sn', 
    'displayName',
]

# ═══════════════════════════════════════════════════════════════
# БЛОК 3: МАППИНГ АТРИБУТОВ
# ═══════════════════════════════════════════════════════════════
ATTRIBUTE_MAP = {
    'sAMAccountName': 'sAMAccountName',
    'objectGUID': 'objectGUID',             # требует преобразования
    'cn': 'cn',
    'mail': 'mail',
    'mobile': 'mobile',
    'title': 'title',
    'company': 'company',
    'department': 'department',
    'thumbnailPhoto': 'thumbnailPhoto',        # требует base64
    'ipPhone': 'ipPhone',
    'telephoneNumber': 'telephoneNumber',
    'givenName': 'givenName',
    'sn': 'sn',
    'whenCreated': 'whenCreated',    # требует преобразования datetime
    'whenChanged': 'whenChanged',    # требует преобразования datetime
    'pager': 'pager',
    'facsimileTelephoneNumber': 'facsimileTelephoneNumber',
    'displayName': 'displayName',
}


# ═══════════════════════════════════════════════════════════════
# БЛОК 4: ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (приватные)
# ═══════════════════════════════════════════════════════════════
def _convert_when_datetime(ldap_value):
    """
    Преобразует LDAP-дату в наивный datetime (без временной зоны).

    Зачем: LDAP отдаёт datetime с timezone (UTC).
    SQLite/Postgres часто хранят naive datetime.
    Разница в 1 секунду между LDAP и БД может сломать сравнения.
    """
    if ldap_value is None:
        return None
    if ldap_value.tzinfo is not None:
        # astimezone(timezone.utc) — приводим к UTC
        # replace(tzinfo=None) — убираем информацию о временной зоне
        return ldap_value.astimezone(timezone.utc).replace(tzinfo=None)
    return ldap_value


def _convert_photo(value):
    """Кодирует бинарные данные фото в base64-строку."""
    if value:
        return base64.b64encode(value).decode('utf-8')
    return None



def _map_entry_to_dict(entry, attributes):
    """
    Преобразует одну LDAP-запись (entry) в обычный словарь Python.

    Зачем: entry — это объект ldap3, с ним неудобно работать.
    Возвращаем dict — его можно передать в шаблон, в JSON, в БД.
    """
    result = {}
    for out_key, ldap_attr in ATTRIBUTE_MAP.items():
        # Проверяем, есть ли атрибут в entry И есть ли значение
        if ldap_attr in entry and getattr(entry, ldap_attr).value:
            raw_value = getattr(entry, ldap_attr).value
            # Спец-обработка для фото
            if ldap_attr == 'thumbnailPhoto':
                result[out_key] = _convert_photo(raw_value)
            # Спец-обработка для whenCreated/whenChanged
            elif ldap_attr in ('whenCreated', 'whenChanged'):
                result[out_key] = _convert_when_datetime(raw_value)
            else:
                result[out_key] = raw_value
        else:
            result[out_key] = None
    return result


# ═══════════════════════════════════════════════════════════════
# БЛОК 5: КЛАСС LDAPRepository
# ═══════════════════════════════════════════════════════════════

class LDAPRepository:
    """
    Репозиторий для операций с данными в LDAP.

    Принимает УЖЕ открытое соединение (LDAPConnection).
    НЕ открывает и НЕ закрывает его — это ответственность вызывающего кода.
    """

    def __init__(self, connection: LDAPConnection):                                 
        self._connection = connection                                               # Сохраняем ссылку на соединение

    
    def search_users(self, search_filter: str, attributes=None):
        """
        Поиск пользователей в LDAP по фильтру.

        Args:
            search_filter: LDAP-фильтр, например "(objectClass=person)"
            attributes: список атрибутов для запроса (если None — DEFAULT_ATTRIBUTES)

        Returns:
            list[dict]: список пользователей в виде словарей

        Raises:
            LDAPSearchError: если соединение не установлено
        """

        # Проверяем что соединение живо
        if not self._connection.is_connected:
            raise LDAPSearchError("Соединение с LDAP не установлено")
        
        if attributes is None:
            attributes = DEFAULT_ATTRIBUTES

        # Выполняем поиск через ldap3
        # connection.search() — ищет в base_dn по фильтру и возвращает атрибуты
        self._connection._connection.search(
            self._connection.config.base_dn,
            search_filter,
            attributes=attributes
        )

        # Преобразуем ldap3-entries в список словарей
        users = []
        for entry in self._connection._connection.entries:
            users.append(_map_entry_to_dict(entry, attributes))

        logger.info(f"Найдено пользователей: {len(users)} (фильтр: {search_filter})")
        return users


# ═══════════════════════════════════════════════════════════════
# МЕТОД: find_by_guid
# ═══════════════════════════════════════════════════════════════
    def find_by_guid(self, guid):
        """
        Найти пользователя по objectGUID.

        Зачем: GUID — это уникальный идентификатор в Active Directory.
        В отличие от sAMAccountName — GUID не меняется при переименовании.

        Args:
            guid: objectGUID пользователя (бинарный или строковый)

        Returns:
            dict или None: данные пользователя, либо None если не найден
        """
        
        search_filter = f"(objectGUID={guid})"                                                          # Формируем LDAP-фильтр: "(objectGUID=...)"
        users = self.search_users(search_filter)                                                        # Получаем пользователей по фильтру
        return users[0] if users else None                                                              # Если список не пустой — возвращаем первого (он должен быть один)


# ═══════════════════════════════════════════════════════════════
# МЕТОД: get_current_user
# ═══════════════════════════════════════════════════════════════
    def get_current_user(self):
        """
        Получить LDAP-запись пользователя, под которым мы подключились.

        Ищет по sAMAccountName (короткий логин) — надёжнее чем userPrincipalName.

        Returns:
            dict или None: данные пользователя со ВСЕМИ атрибутами из ATTRIBUTE_MAP

        Raises:
            LDAPSearchError: если соединение не установлено
        """
        if not self._connection.is_connected:
            raise LDAPSearchError("Соединение с LDAP не установлено")

        # Извлекаем короткий логин из config.user:
        username = self._connection.config.user
        if '@' in username:
            username = username.split('@')[0]        # "user@domain" → "user"
        elif '\\' in username:
            username = username.split('\\')[1]       # "DOMAIN\\user" → "user"

        users = self.search_users(f"(sAMAccountName={username})")       # Делегируем search_users — он вернёт ВСЕ атрибуты по ATTRIBUTE_MAP

        if users:
            logger.info(f"Текущий пользователь LDAP найден: {users[0].get('cn')}")
            return users[0]

        logger.info(f"Текущий пользователь не найден в LDAP (sAMAccountName={username})")
        return None



