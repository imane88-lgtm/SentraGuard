import os
import hashlib
import json
from datetime import datetime
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

KEYS_DIR = os.path.join(os.path.dirname(__file__), '../../keys')

def generate_key(key_name='default'):
    key = AESGCM.generate_key(bit_length=256)
    path = os.path.join(KEYS_DIR, f'{key_name}.key')
    with open(path, 'wb') as f:
        f.write(key)
    return path

def load_key(key_name='default'):
    path = os.path.join(KEYS_DIR, f'{key_name}.key')
    with open(path, 'rb') as f:
        return f.read()

def derive_key_from_password(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000
    )
    return kdf.derive(password.encode())

def hash_file(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256.update(chunk)
    return sha256.hexdigest()

def encrypt_file(input_path, key_name='default', password=None, unlock_time=None):
    # Key derivation
    salt = None
    if password:
        salt = os.urandom(16)
        key = derive_key_from_password(password, salt)
    else:
        key = load_key(key_name)

    aesgcm = AESGCM(key)
    nonce = os.urandom(12)

    with open(input_path, 'rb') as f:
        data = f.read()

    # Build metadata
    file_hash = hashlib.sha256(data).hexdigest()
    metadata = {
        'filename': os.path.basename(input_path),
        'encrypted_at': datetime.utcnow().isoformat(),
        'hash': file_hash,
        'unlock_time': unlock_time,
        'password_protected': bool(password),
        'status': 'locked'
    }
    meta_bytes = json.dumps(metadata).encode()
    meta_len = len(meta_bytes).to_bytes(4, 'big')

    encrypted = aesgcm.encrypt(nonce, data, None)
    out_path = input_path + '.enc'

    with open(out_path, 'wb') as f:
        # Format: meta_len(4) + meta + salt(16 if password) + nonce(12) + ciphertext
        f.write(meta_len)
        f.write(meta_bytes)
        if salt:
            f.write(salt)
        f.write(nonce)
        f.write(encrypted)

    return out_path, metadata

def decrypt_file(enc_path, key_name='default', password=None):
    with open(enc_path, 'rb') as f:
        raw = f.read()

    # Parse metadata
    meta_len = int.from_bytes(raw[:4], 'big')
    meta_bytes = raw[4:4+meta_len]
    metadata = json.loads(meta_bytes.decode())
    offset = 4 + meta_len

    # Timelock check
    unlock_time = metadata.get('unlock_time')
    if unlock_time:
        unlock_dt = datetime.fromisoformat(unlock_time)
        if datetime.utcnow() < unlock_dt:
            raise ValueError(
                f"File is timelocked until {unlock_dt.strftime('%Y-%m-%d %H:%M:%S')} UTC"
            )

    # Key
    if metadata.get('password_protected'):
        if not password:
            raise ValueError("This file requires a password to decrypt")
        salt = raw[offset:offset+16]
        offset += 16
        key = derive_key_from_password(password, salt)
    else:
        key = load_key(key_name)

    nonce = raw[offset:offset+12]
    ciphertext = raw[offset+12:]

    aesgcm = AESGCM(key)
    try:
        decrypted = aesgcm.decrypt(nonce, ciphertext, None)
    except Exception:
        raise ValueError("Decryption failed — wrong password or corrupted file")

    # Verify hash
    actual_hash = hashlib.sha256(decrypted).hexdigest()
    if actual_hash != metadata.get('hash'):
        raise ValueError("File integrity check failed — hash mismatch")

    out_path = enc_path.replace('.enc', '.dec')
    with open(out_path, 'wb') as f:
        f.write(decrypted)

    metadata['status'] = 'unlocked'
    return out_path, metadata
