from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

def generate_key_from_pin(pin: str, salt: bytes = None) -> tuple[bytes, bytes]:
    """Generate a secure key from PIN using PBKDF2."""
    if salt is None:
        salt = os.urandom(16)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(pin.encode()))
    return key, salt

def encrypt_data(data: str, pin: str) -> bytes:
    """Encrypt data using Fernet (AES-128)."""
    key, salt = generate_key_from_pin(pin)
    f = Fernet(key)
    # Prepend salt to encrypted data
    encrypted_data = f.encrypt(data.encode())
    return salt + encrypted_data

def decrypt_data(encrypted_data: bytes, pin: str) -> str:
    """Decrypt data using Fernet (AES-128)."""
    # Extract salt and encrypted data
    salt = encrypted_data[:16]
    data = encrypted_data[16:]
    key, _ = generate_key_from_pin(pin, salt)
    f = Fernet(key)
    decrypted_data = f.decrypt(data)
    return decrypted_data.decode() 