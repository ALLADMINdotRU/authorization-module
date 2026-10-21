"""Сервис шифрования для хранения чувствительных данных в БД."""
import base64
import os
from cryptography.fernet import Fernet

import logging
logger = logging.getLogger(__name__)


class SimpleEncryptionService:
    """
    Шифрует/дешифрует строки с помощью Fernet (AES-128).

    Ключ шифрования хранится в переменной окружения ENCRYPTION_KEY.
    Если ключ не задан — генерируется временный (при перезапуске приложения
    старые пароли расшифровать не получится).
    """
    @staticmethod
    def _get_key():
        """
        Получить ключ шифрования из переменной окружения.

        Ключ должен быть в base64 (как генерирует Fernet.generate_key()).
        Если не задан — генерируем новый (с предупреждением в лог).
        """
        key = os.environ.get('ENCRYPTION_KEY')
        if not key:
            # Генерируем временный ключ — старые пароли не расшифруются
            key = Fernet.generate_key()
            logger.warning(
                "ENCRYPTION_KEY не задан в .env! "
                "Сгенерирован временный ключ. "
                "При перезапуске приложения зашифрованные пароли станут невалидны."
            )
            # Сохраняем как строку
            key = key.decode() if isinstance(key, bytes) else key
        return key.encode() if isinstance(key, str) else key


    @staticmethod
    def encrypt(plaintext: str) -> str:
        """
        Зашифровать строку.

        Args:
            plaintext: открытый текст

        Returns:
            str: зашифрованная строка в base64
        """
        if not plaintext:
            return ""
        key = SimpleEncryptionService._get_key()
        f = Fernet(key)
        # fernet работает с bytes
        encrypted = f.encrypt(plaintext.encode('utf-8'))
        # Возвращаем как строку (чтобы сохранить в Text-поле БД)
        return encrypted.decode('utf-8')


    @staticmethod
    def decrypt(ciphertext: str) -> str:
        """
        Расшифровать строку.

        Args:
            ciphertext: зашифрованная строка в base64

        Returns:
            str: открытый текст

        Raises:
            cryptography.fernet.InvalidToken: если ключ не совпадает
        """
        if not ciphertext:
            return ""
        key = SimpleEncryptionService._get_key()
        f = Fernet(key)
        decrypted = f.decrypt(ciphertext.encode('utf-8'))
        return decrypted.decode('utf-8')