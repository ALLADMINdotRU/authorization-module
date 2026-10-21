from dataclasses import dataclass, field
from .exceptions import LDAPConfigError

@dataclass
class LDAPConfig:
    server_url: str
    user: str = ""
    password: str = ""
    base_dn: str = ""
    use_ssl: bool = False

    def validate(self):
        if not self.server_url:
            raise LDAPConfigError("server_url обязателен")
        if not self.base_dn:
            raise LDAPConfigError("base_dn обязателен")
        