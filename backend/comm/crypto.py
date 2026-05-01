import rsa
import os
import json
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KEYS_DIR = os.path.join(os.path.dirname(__file__), '../../keys')

def generate_rsa_keypair(name='comm'):
    pub_key, priv_key = rsa.newkeys(2048)
    pub_path  = os.path.join(KEYS_DIR, f'{name}_pub.pem')
    priv_path = os.path.join(KEYS_DIR, f'{name}_priv.pem')
    with open(pub_path,  'wb') as f: f.write(pub_key.save_pkcs1())
    with open(priv_path, 'wb') as f: f.write(priv_key.save_pkcs1())
    return pub_path, priv_path

def load_rsa_public(name='comm'):
    path = os.path.join(KEYS_DIR, f'{name}_pub.pem')
    if not os.path.exists(path):
        return None
    with open(path, 'rb') as f:
        return rsa.PublicKey.load_pkcs1(f.read())

def load_rsa_private(name='comm'):
    path = os.path.join(KEYS_DIR, f'{name}_priv.pem')
    if not os.path.exists(path):
        return None
    with open(path, 'rb') as f:
        return rsa.PrivateKey.load_pkcs1(f.read())

def get_public_key_pem(name='comm'):
    path = os.path.join(KEYS_DIR, f'{name}_pub.pem')
    if not os.path.exists(path):
        generate_rsa_keypair(name)
    with open(path, 'rb') as f:
        return f.read().decode()

def encrypt_message(message: str, receiver_pub_pem: str, access_password: str = None) -> dict:
    aes_key = AESGCM.generate_key(bit_length=256)
    nonce   = os.urandom(12)
    aesgcm  = AESGCM(aes_key)

    # If password provided, encrypt message content with password too
    if access_password:
        import hashlib
        pwd_hash = hashlib.sha256(access_password.encode()).hexdigest()
        message_to_encrypt = f"LOCKED:{pwd_hash}:{message}"
    else:
        message_to_encrypt = message

    encrypted_msg = aesgcm.encrypt(nonce, message_to_encrypt.encode(), None)
    pub_key       = rsa.PublicKey.load_pkcs1(receiver_pub_pem.encode())
    encrypted_key = rsa.encrypt(aes_key, pub_key)
    msg_hash      = hashlib.sha256(message.encode()).hexdigest()

    return {
        'encrypted_message':  base64.b64encode(encrypted_msg).decode(),
        'encrypted_key':      base64.b64encode(encrypted_key).decode(),
        'nonce':              base64.b64encode(nonce).decode(),
        'hash':               msg_hash,
        'password_protected': bool(access_password)
    }

def decrypt_message(payload: dict, receiver_name='comm', access_password: str = None) -> dict:
    priv_key      = load_rsa_private(receiver_name)
    encrypted_key = base64.b64decode(payload['encrypted_key'])
    encrypted_msg = base64.b64decode(payload['encrypted_message'])
    nonce         = base64.b64decode(payload['nonce'])

    aes_key   = rsa.decrypt(encrypted_key, priv_key)
    aesgcm    = AESGCM(aes_key)
    plaintext = aesgcm.decrypt(nonce, encrypted_msg, None).decode()

    # Check password protection
    if plaintext.startswith('LOCKED:'):
        parts    = plaintext.split(':', 2)
        pwd_hash = parts[1]
        content  = parts[2]

        if not access_password:
            return {
                'locked':   True,
                'message':  '🔒 This message is password protected',
                'content':  None
            }

        import hashlib
        provided_hash = hashlib.sha256(access_password.encode()).hexdigest()
        if provided_hash != pwd_hash:
            raise ValueError('Wrong password — cannot decrypt message')

        plaintext = content

    msg_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    if msg_hash != payload.get('hash', '') and not payload.get('password_protected'):
        raise ValueError('Message integrity check failed')

    return {'locked': False, 'message': plaintext, 'content': plaintext}

def encrypt_file_for_transfer(file_path: str, receiver_pub_pem: str) -> dict:
    with open(file_path, 'rb') as f:
        data = f.read()

    aes_key  = AESGCM.generate_key(bit_length=256)
    nonce    = os.urandom(12)
    aesgcm   = AESGCM(aes_key)
    enc_data = aesgcm.encrypt(nonce, data, None)

    pub_key       = rsa.PublicKey.load_pkcs1(receiver_pub_pem.encode())
    encrypted_key = rsa.encrypt(aes_key, pub_key)

    file_hash = hashlib.sha256(data).hexdigest()

    return {
        'filename':          os.path.basename(file_path),
        'encrypted_data':    base64.b64encode(enc_data).decode(),
        'encrypted_key':     base64.b64encode(encrypted_key).decode(),
        'nonce':             base64.b64encode(nonce).decode(),
        'hash':              file_hash,
        'size':              len(data)
    }

def decrypt_file_from_transfer(payload: dict, output_dir: str, receiver_name='comm') -> str:
    priv_key      = load_rsa_private(receiver_name)
    encrypted_key = base64.b64decode(payload['encrypted_key'])
    encrypted_data= base64.b64decode(payload['encrypted_data'])
    nonce         = base64.b64decode(payload['nonce'])

    aes_key   = rsa.decrypt(encrypted_key, priv_key)
    aesgcm    = AESGCM(aes_key)
    decrypted = aesgcm.decrypt(nonce, encrypted_data, None)

    actual_hash = hashlib.sha256(decrypted).hexdigest()
    if actual_hash != payload.get('hash', ''):
        raise ValueError('File integrity check failed')

    out_path = os.path.join(output_dir, payload['filename'])
    with open(out_path, 'wb') as f:
        f.write(decrypted)

    return out_path
