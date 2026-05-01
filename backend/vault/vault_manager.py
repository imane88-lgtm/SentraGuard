import os
import json
import shutil
import hashlib
from datetime import datetime
from backend.encryption.aes import encrypt_file, decrypt_file, generate_key

VAULT_DIR = os.path.join(os.path.dirname(__file__), '../../vault')
VAULT_META = os.path.join(VAULT_DIR, '.vault_meta.json')
VAULT_KEY  = 'vault_master'

def ensure_vault():
    os.makedirs(VAULT_DIR, exist_ok=True)
    if not os.path.exists(VAULT_META):
        _save_meta({})

def _load_meta():
    if not os.path.exists(VAULT_META):
        return {}
    with open(VAULT_META, 'r') as f:
        return json.load(f)

def _save_meta(meta):
    with open(VAULT_META, 'w') as f:
        json.dump(meta, f, indent=2)

def get_vault_key():
    keys_dir = os.path.join(os.path.dirname(__file__), '../../keys')
    key_path = os.path.join(keys_dir, f'{VAULT_KEY}.key')
    if not os.path.exists(key_path):
        generate_key(VAULT_KEY)
    return VAULT_KEY

def add_to_vault(file_path: str, password: str = None, delete_original: bool = False):
    ensure_vault()
    if not os.path.exists(file_path):
        raise FileNotFoundError(f'File not found: {file_path}')

    filename   = os.path.basename(file_path)
    vault_id   = hashlib.md5(
        (filename + datetime.now().isoformat()).encode()
    ).hexdigest()[:12]
    vault_path = os.path.join(VAULT_DIR, f'{vault_id}_{filename}')

    # Copy to vault dir first
    shutil.copy2(file_path, vault_path)

    # Encrypt in vault
    key_name = get_vault_key()
    enc_path, metadata = encrypt_file(vault_path, key_name, password)

    # Remove unencrypted copy in vault
    os.remove(vault_path)

    # Store metadata
    meta = _load_meta()
    meta[vault_id] = {
        'id':           vault_id,
        'filename':     filename,
        'original_path':file_path,
        'vault_file':   enc_path,
        'added_at':     datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'size':         os.path.getsize(enc_path),
        'hash':         metadata.get('hash', ''),
        'password_protected': bool(password)
    }
    _save_meta(meta)

    # Delete original if requested
    if delete_original and os.path.exists(file_path):
        os.remove(file_path)

    return meta[vault_id]

def list_vault():
    ensure_vault()
    meta = _load_meta()
    items = []
    for vid, item in meta.items():
        item['exists'] = os.path.exists(item.get('vault_file', ''))
        items.append(item)
    return sorted(items, key=lambda x: x['added_at'], reverse=True)

def get_from_vault(vault_id: str, output_dir: str, password: str = None):
    ensure_vault()
    meta = _load_meta()
    if vault_id not in meta:
        raise ValueError(f'Item {vault_id} not found in vault')

    item     = meta[vault_id]
    enc_path = item['vault_file']

    if not os.path.exists(enc_path):
        raise FileNotFoundError(f'Vault file missing: {enc_path}')

    key_name = get_vault_key()
    out_path, file_meta = decrypt_file(enc_path, key_name, password)

    # Move to output dir
    final_path = os.path.join(output_dir, item['filename'])
    shutil.move(out_path, final_path)
    return final_path

def remove_from_vault(vault_id: str):
    ensure_vault()
    meta = _load_meta()
    if vault_id not in meta:
        raise ValueError(f'Item {vault_id} not found')
    item = meta[vault_id]
    if os.path.exists(item.get('vault_file', '')):
        os.remove(item['vault_file'])
    del meta[vault_id]
    _save_meta(meta)

def get_vault_stats():
    ensure_vault()
    meta  = _load_meta()
    total = len(meta)
    size  = sum(
        i.get('size', 0) for i in meta.values()
        if os.path.exists(i.get('vault_file', ''))
    )
    pw_protected = sum(1 for i in meta.values() if i.get('password_protected'))
    return {
        'total_files':    total,
        'total_size_mb':  round(size / 1e6, 2),
        'pw_protected':   pw_protected,
        'vault_dir':      VAULT_DIR
    }
