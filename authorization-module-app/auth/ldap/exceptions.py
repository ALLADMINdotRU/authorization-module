class LDAPError(Exception):
    """Базовое исключение LDAP."""

class LDAPConnectionError(LDAPError):
    """Ошибка подключения к LDAP-серверу."""

class LDAPBindError(LDAPError):
    """Ошибка аутентификации (bind) в LDAP."""

class LDAPSearchError(LDAPError):
    """Ошибка поиска в LDAP."""

class LDAPConfigError(LDAPError):
    """Ошибка конфигурации LDAP."""