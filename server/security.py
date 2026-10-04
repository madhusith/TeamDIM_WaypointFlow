"""Small password and signed-token helpers for seeded demo accounts."""

import base64
import binascii
import hashlib
import hmac
import json
import os
import secrets
import time


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 210_000)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, expected_hex = stored.split(":", 1)
        actual = hash_password(password, bytes.fromhex(salt_hex)).split(":", 1)[1]
        return hmac.compare_digest(actual, expected_hex)
    except (ValueError, TypeError):
        return False


def issue_token(user_id: int) -> str:
    payload = {"sub": user_id, "exp": int(time.time()) + 12 * 60 * 60}
    raw = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).rstrip(b"=")
    signature = hmac.new(os.environ["APP_SECRET"].encode(), raw, hashlib.sha256).digest()
    return f"{raw.decode()}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"


def read_token(token: str) -> int | None:
    try:
        raw, encoded_signature = token.split(".", 1)
        expected = hmac.new(os.environ["APP_SECRET"].encode(), raw.encode(), hashlib.sha256).digest()
        actual = base64.urlsafe_b64decode(encoded_signature + "=" * (-len(encoded_signature) % 4))
        if not hmac.compare_digest(expected, actual):
            return None
        payload = json.loads(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)))
        if payload["exp"] < time.time():
            return None
        return int(payload["sub"])
    except (ValueError, KeyError, TypeError, UnicodeError, json.JSONDecodeError, binascii.Error):
        return None
