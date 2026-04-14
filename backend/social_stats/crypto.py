"""
Fernet-based field encryption for sensitive data (OAuth tokens, etc.).

Encrypted values are stored with an ``enc::`` prefix so the system can
distinguish them from legacy plaintext values during migration rollout.
"""

import base64
import hashlib

from cryptography.fernet import Fernet
from django.conf import settings

ENCRYPTED_PREFIX = 'enc::'


def _get_key():
    """Derive a 32-byte Fernet key from FIELD_ENCRYPTION_KEY or SECRET_KEY."""
    raw = getattr(settings, 'FIELD_ENCRYPTION_KEY', None) or settings.SECRET_KEY
    dk = hashlib.pbkdf2_hmac('sha256', raw.encode(), b'statox-field-enc', 100_000)
    return base64.urlsafe_b64encode(dk[:32])


def encrypt_value(plaintext):
    """Encrypt a string. Returns '' unchanged."""
    if not plaintext:
        return plaintext
    if isinstance(plaintext, str) and plaintext.startswith(ENCRYPTED_PREFIX):
        return plaintext                       # already encrypted
    f = Fernet(_get_key())
    return ENCRYPTED_PREFIX + f.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext):
    """Decrypt an enc::-prefixed string. Returns legacy plaintext as-is."""
    if not ciphertext:
        return ciphertext
    if not ciphertext.startswith(ENCRYPTED_PREFIX):
        return ciphertext                      # legacy plaintext — transparent fallback
    f = Fernet(_get_key())
    return f.decrypt(ciphertext[len(ENCRYPTED_PREFIX):].encode()).decode()
