from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _fernet() -> Fernet:
    key = settings.gmail_token_encryption_key.strip()
    if not key:
        raise RuntimeError("GMAIL_TOKEN_ENCRYPTION_KEY is not set")
    return Fernet(key.encode("ascii"))


def encrypt_refresh_token(plain: str) -> bytes:
    return _fernet().encrypt(plain.encode("utf-8"))


def decrypt_refresh_token(ciphertext: bytes) -> str:
    try:
        return _fernet().decrypt(ciphertext).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Invalid or corrupted token ciphertext") from exc
