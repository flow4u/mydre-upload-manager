from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import logging

logger = logging.getLogger(__name__)

def derive_key_from_pin(pin: str, salt: bytes = b'myDRE') -> bytes:
    """Derive an encryption key from the PIN."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(pin.encode()))
    return key

def encrypt_data(data: str, pin: str) -> bytes:
    """Encrypt data using PIN-derived key."""
    try:
        key = derive_key_from_pin(pin)
        f = Fernet(key)
        encrypted_data = f.encrypt(data.encode())
        return encrypted_data
    except Exception as e:
        logger.error(f"Encryption error: {str(e)}")
        raise

def decrypt_data(encrypted_data: bytes, pin: str) -> str:
    """Decrypt data using PIN-derived key."""
    try:
        logger.debug(f"Starting decryption with PIN length: {len(pin)}")
        key = derive_key_from_pin(pin)
        logger.debug("Key derived successfully")
        
        f = Fernet(key)
        logger.debug("Fernet instance created")
        
        decrypted_data = f.decrypt(encrypted_data)
        logger.debug("Data decrypted successfully")
        
        return decrypted_data.decode()
    except Exception as e:
        logger.error(f"Decryption error: {str(e)}")
        raise ValueError(f"Failed to decrypt data: {str(e)}") 