import hashlib
import os
from flask import Blueprint, request, jsonify
from backend.encryption.aes import (
    generate_key, encrypt_file, decrypt_file, hash_file
)
from backend.alerts.alert_manager import create_alert

enc_bp = Blueprint('encryption', __name__)

@enc_bp.route('/api/encryption/generate-key', methods=['POST'])
def gen_key():
    data = request.get_json()
    name = data.get('key_name', 'default')
    path = generate_key(name)
    return jsonify({'message': 'Key generated', 'path': path}), 201

@enc_bp.route('/api/encryption/encrypt', methods=['POST'])
def encrypt():
    data = request.get_json()
    path = data.get('file_path')
    key_name = data.get('key_name', 'default')
    password = data.get('password') or None
    unlock_time = data.get('unlock_time') or None

    if not path or not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404

    try:
        out, metadata = encrypt_file(path, key_name, password, unlock_time)
        create_alert('info', f'File encrypted: {os.path.basename(path)}', 'encryption')
        return jsonify({
            'message': 'File encrypted',
            'output': out,
            'metadata': metadata
        }), 200
    except Exception as e:
        create_alert('warning', f'Encryption failed: {str(e)}', 'encryption')
        return jsonify({'error': str(e)}), 500

@enc_bp.route('/api/encryption/decrypt', methods=['POST'])
def decrypt():
    data = request.get_json()
    path = data.get('file_path')
    key_name = data.get('key_name', 'default')
    password = data.get('password') or None

    if not path or not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404

    try:
        out, metadata = decrypt_file(path, key_name, password)
        create_alert('info', f'File decrypted: {os.path.basename(path)}', 'encryption')
        return jsonify({
            'message': 'File decrypted',
            'output': out,
            'metadata': metadata
        }), 200
    except ValueError as e:
        create_alert('critical', f'Decryption failed: {str(e)}', 'encryption')
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@enc_bp.route('/api/encryption/hash', methods=['POST'])
def hash_endpoint():
    data = request.get_json()
    path = data.get('file_path')
    if not path or not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404
    file_hash = hash_file(path)
    return jsonify({
        'filename': os.path.basename(path),
        'size_bytes': os.path.getsize(path),
        'hash': file_hash
    }), 200
