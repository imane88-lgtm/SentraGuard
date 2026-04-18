import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

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

def encrypt_file(input_path, key_name='default'):
    key = load_key(key_name)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)

    with open(input_path, 'rb') as f:
        data = f.read()

    encrypted = aesgcm.encrypt(nonce, data, None)
    out_path = input_path + '.enc'

    with open(out_path, 'wb') as f:
        f.write(nonce + encrypted)

    return out_path

def decrypt_file(enc_path, key_name='default'):
    key = load_key(key_name)
    aesgcm = AESGCM(key)

    with open(enc_path, 'rb') as f:
        raw = f.read()

    nonce = raw[:12]
    ciphertext = raw[12:]
    decrypted = aesgcm.decrypt(nonce, ciphertext, None)

    out_path = enc_path.replace('.enc', '.dec')
    with open(out_path, 'wb') as f:
        f.write(decrypted)

    return out_path
