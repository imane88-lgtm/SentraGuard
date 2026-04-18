from flask import Blueprint, request, jsonify
from backend.encryption.aes import generate_key, encrypt_file, decrypt_file

enc_bp = Blueprint('encryption', __name__)

@enc_bp.route('/api/encryption/generate-key', methods=['POST'])
def gen_key():
    data = request.get_json()
    name = data.get('key_name', 'default')
    path = generate_key(name)
    return jsonify({'message': f'Key generated', 'path': path}), 201

@enc_bp.route('/api/encryption/encrypt', methods=['POST'])
def encrypt():
    data = request.get_json()
    path = data.get('file_path')
    key_name = data.get('key_name', 'default')
    out = encrypt_file(path, key_name)
    return jsonify({'message': 'File encrypted', 'output': out}), 200

@enc_bp.route('/api/encryption/decrypt', methods=['POST'])
def decrypt():
    data = request.get_json()
    path = data.get('file_path')
    key_name = data.get('key_name', 'default')
    out = decrypt_file(path, key_name)
    return jsonify({'message': 'File decrypted', 'output': out}), 200
