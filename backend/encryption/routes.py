import hashlib
import os
import json as _json
from flask import Blueprint, request, jsonify
from backend.encryption.aes import generate_key, encrypt_file, decrypt_file, hash_file
from backend.alerts.alert_manager import create_alert
from backend.logs.activity import log

enc_bp = Blueprint('encryption', __name__)

@enc_bp.route('/api/encryption/generate-key', methods=['POST'])
def gen_key():
    data = request.get_json()
    name = data.get('key_name', 'default')
    path = generate_key(name)
    log('encryption', 'key_generated', f'Key: {name}')
    return jsonify({'message': 'Key generated', 'path': path}), 201

@enc_bp.route('/api/encryption/encrypt', methods=['POST'])
def encrypt():
    data        = request.get_json()
    path        = data.get('file_path')
    key_name    = data.get('key_name', 'default')
    password    = data.get('password') or None
    unlock_time = data.get('unlock_time') or None
    if not path or not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404
    try:
        out, metadata = encrypt_file(path, key_name, password, unlock_time)
        create_alert('info', f'File encrypted: {os.path.basename(path)}', 'encryption')
        log('encryption', 'encrypt_success', f'File: {path} → {out}')
        return jsonify({'message': 'File encrypted',
                        'output': out, 'metadata': metadata}), 200
    except Exception as e:
        create_alert('warning', f'Encryption failed: {str(e)}', 'encryption')
        log('encryption', 'encrypt_failed', str(e), 'error')
        return jsonify({'error': str(e)}), 500

@enc_bp.route('/api/encryption/decrypt', methods=['POST'])
def decrypt():
    data     = request.get_json()
    path     = data.get('file_path')
    key_name = data.get('key_name', 'default')
    password = data.get('password') or None
    if not path or not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404
    try:
        out, metadata = decrypt_file(path, key_name, password)
        create_alert('info', f'File decrypted: {os.path.basename(path)}', 'encryption')
        log('decryption', 'decrypt_success', f'File: {path}')
        return jsonify({'message': 'File decrypted',
                        'output': out, 'metadata': metadata}), 200
    except ValueError as e:
        create_alert('critical', f'Decryption failed: {str(e)}', 'encryption')
        log('decryption', 'decrypt_failed', str(e), 'error')
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        log('decryption', 'decrypt_error', str(e), 'error')
        return jsonify({'error': str(e)}), 500

@enc_bp.route('/api/encryption/hash', methods=['POST'])
def hash_endpoint():
    data = request.get_json()
    path = data.get('file_path')
    if not path or not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404
    file_hash = hash_file(path)
    log('integrity', 'hash_generated', f'File: {path}')
    return jsonify({
        'filename':   os.path.basename(path),
        'size_bytes': os.path.getsize(path),
        'hash':       file_hash
    }), 200

@enc_bp.route('/api/encryption/integrity', methods=['POST'])
def check_integrity():
    data          = request.get_json()
    original_path = data.get('original_path')
    enc_path      = data.get('enc_path')

    if original_path and enc_path:
        if not os.path.exists(original_path):
            return jsonify({'error': 'Original file not found'}), 404
        if not os.path.exists(enc_path):
            return jsonify({'error': 'Encrypted file not found'}), 404
        with open(enc_path, 'rb') as f:
            raw = f.read()
        meta_len    = int.from_bytes(raw[:4], 'big')
        metadata    = _json.loads(raw[4:4+meta_len])
        stored_hash = metadata.get('hash', '')
        current_hash = hash_file(original_path)
        match = current_hash == stored_hash
        status = 'safe' if match else 'modified'
        log('integrity', f'integrity_{status}', f'File: {original_path}',
            'success' if match else 'error')
        if not match:
            create_alert('critical',
                f'Integrity check FAILED: {os.path.basename(original_path)} modified',
                'integrity')
        return jsonify({
            'status':       status,
            'stored_hash':  stored_hash,
            'current_hash': current_hash,
            'filename':     os.path.basename(original_path),
            'match':        match
        }), 200

    if original_path:
        if not os.path.exists(original_path):
            return jsonify({'error': 'File not found'}), 404
        current_hash = hash_file(original_path)
        log('integrity', 'hash_generated', f'File: {original_path}')
        return jsonify({
            'status':       'hashed',
            'current_hash': current_hash,
            'filename':     os.path.basename(original_path)
        }), 200

    return jsonify({'error': 'Provide at least original_path'}), 400
