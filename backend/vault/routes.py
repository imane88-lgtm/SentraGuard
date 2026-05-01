from flask import Blueprint, request, jsonify
from backend.vault.vault_manager import (
    add_to_vault, list_vault, get_from_vault,
    remove_from_vault, get_vault_stats
)
from backend.logs.activity import log

vault_bp = Blueprint('vault', __name__)

@vault_bp.route('/api/vault', methods=['GET'])
def vault_list():
    return jsonify(list_vault()), 200

@vault_bp.route('/api/vault/stats', methods=['GET'])
def vault_stats():
    return jsonify(get_vault_stats()), 200

@vault_bp.route('/api/vault/add', methods=['POST'])
def vault_add():
    data            = request.get_json()
    file_path       = data.get('file_path')
    password        = data.get('password') or None
    delete_original = data.get('delete_original', False)
    if not file_path:
        return jsonify({'error': 'file_path required'}), 400
    try:
        item = add_to_vault(file_path, password, delete_original)
        log('encryption', 'vault_add', f'Added to vault: {file_path}')
        return jsonify({'message': 'File added to vault', 'item': item}), 201
    except Exception as e:
        log('encryption', 'vault_add_failed', str(e), 'error')
        return jsonify({'error': str(e)}), 500

@vault_bp.route('/api/vault/retrieve', methods=['POST'])
def vault_retrieve():
    data       = request.get_json()
    vault_id   = data.get('vault_id')
    output_dir = data.get('output_dir', '/tmp')
    password   = data.get('password') or None
    if not vault_id:
        return jsonify({'error': 'vault_id required'}), 400
    try:
        path = get_from_vault(vault_id, output_dir, password)
        log('decryption', 'vault_retrieve', f'Retrieved: {vault_id}')
        return jsonify({'message': 'File retrieved', 'path': path}), 200
    except Exception as e:
        log('decryption', 'vault_retrieve_failed', str(e), 'error')
        return jsonify({'error': str(e)}), 403

@vault_bp.route('/api/vault/<vault_id>', methods=['DELETE'])
def vault_delete(vault_id):
    try:
        remove_from_vault(vault_id)
        log('encryption', 'vault_delete', f'Removed: {vault_id}')
        return jsonify({'message': 'Removed from vault'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404

