import os
import json
import requests
from flask import Blueprint, request, jsonify
from backend.comm.crypto import (
    get_public_key_pem, encrypt_message, decrypt_message,
    encrypt_file_for_transfer, decrypt_file_from_transfer,
    generate_rsa_keypair
)
from backend.logs.activity import log

comm_bp = Blueprint('comm', __name__)

# In-memory chat history
chat_history = []
RECEIVED_FILES_DIR = os.path.expanduser('~/SentraGuard/received_files')

def ensure_dirs():
    os.makedirs(RECEIVED_FILES_DIR, exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(__file__), '../../keys'), exist_ok=True)

@comm_bp.route('/api/comm/pubkey', methods=['GET'])
def get_pubkey():
    ensure_dirs()
    name = request.args.get('name', 'comm')
    pem  = get_public_key_pem(name)
    return jsonify({'public_key': pem, 'name': name}), 200

@comm_bp.route('/api/comm/genkeys', methods=['POST'])
def gen_keys():
    ensure_dirs()
    pub, priv = generate_rsa_keypair('comm')
    log('system', 'rsa_keys_generated', f'pub:{pub} priv:{priv}')
    return jsonify({'message': 'RSA keypair generated', 'pub': pub, 'priv': priv}), 201

@comm_bp.route('/api/comm/send-message', methods=['POST'])
def send_message():
    data             = request.get_json()
    message          = data.get('message', '').strip()
    receiver_ip      = data.get('receiver_ip', '')
    sender_name      = data.get('sender_name', 'Kali')
    access_password  = data.get('access_password') or None

    if not message or not receiver_ip:
        return jsonify({'error': 'message and receiver_ip required'}), 400
    try:
        r            = requests.get(f'http://{receiver_ip}:5000/api/comm/pubkey', timeout=5)
        receiver_pub = r.json()['public_key']
        payload      = encrypt_message(message, receiver_pub, access_password)
        payload['sender']             = sender_name
        payload['sender_ip']          = request.remote_addr
        payload['access_password']    = access_password

        r2 = requests.post(
            f'http://{receiver_ip}:5000/api/comm/receive-message',
            json=payload, timeout=10
        )
        chat_history.append({
            'type':               'sent',
            'message':            message,
            'to':                 receiver_ip,
            'sender':             sender_name,
            'encrypted':          True,
            'password_protected': bool(access_password),
            'status':             'delivered' if r2.ok else 'failed',
            'timestamp':          __import__('datetime').datetime.now().strftime('%H:%M:%S')
        })
        log('system', 'message_sent', f'To {receiver_ip}')
        return jsonify({'message': 'Sent encrypted'}), 200
    except requests.ConnectionError:
        return jsonify({'error': f'Cannot connect to {receiver_ip}:5000'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@comm_bp.route('/api/comm/receive-message', methods=['POST'])
def receive_message():
    payload         = request.get_json()
    access_password = payload.get('access_password') or None
    try:
        result = decrypt_message(payload, 'comm', access_password)
        entry  = {
            'type':               'received',
            'message':            result['message'],
            'locked':             result.get('locked', False),
            'from':               payload.get('sender', 'Unknown'),
            'from_ip':            payload.get('sender_ip', request.remote_addr),
            'encrypted':          True,
            'password_protected': payload.get('password_protected', False),
            'status':             'received',
            'timestamp':          __import__('datetime').datetime.now().strftime('%H:%M:%S')
        }
        chat_history.append(entry)
        log('system', 'message_received', f'From {entry["from"]}')
        return jsonify({'message': 'Received', 'entry': entry}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@comm_bp.route('/api/comm/send-file', methods=['POST'])
def send_file():
    data        = request.get_json()
    file_path   = data.get('file_path', '')
    receiver_ip = data.get('receiver_ip', '')
    sender_name = data.get('sender_name', 'Kali')

    if not file_path or not receiver_ip:
        return jsonify({'error': 'file_path and receiver_ip required'}), 400

    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    try:
        # Get receiver public key
        r = requests.get(f'http://{receiver_ip}:5000/api/comm/pubkey', timeout=5)
        receiver_pub = r.json()['public_key']

        # Encrypt file
        payload = encrypt_file_for_transfer(file_path, receiver_pub)
        payload['sender']    = sender_name
        payload['sender_ip'] = request.remote_addr

        # Send to receiver
        r = requests.post(
            f'http://{receiver_ip}:5000/api/comm/receive-file',
            json=payload,
            timeout=30
        )

        chat_history.append({
            'type':      'sent_file',
            'message':   f'File: {payload["filename"]} ({payload["size"]} bytes)',
            'to':        receiver_ip,
            'sender':    sender_name,
            'encrypted': True,
            'status':    'delivered' if r.ok else 'failed',
            'timestamp': __import__('datetime').datetime.now().strftime('%H:%M:%S')
        })

        log('system', 'file_sent', f'File {file_path} → {receiver_ip}')
        return jsonify({'message': f'File sent encrypted to {receiver_ip}', 'filename': payload['filename']}), 200

    except requests.ConnectionError:
        return jsonify({'error': f'Cannot connect to {receiver_ip}:5000'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@comm_bp.route('/api/comm/receive-file', methods=['POST'])
def receive_file():
    ensure_dirs()
    payload = request.get_json()
    try:
        out_path = decrypt_file_from_transfer(payload, RECEIVED_FILES_DIR, 'comm')
        entry = {
            'type':      'received_file',
            'message':   f'File received: {payload["filename"]} ({payload["size"]} bytes)',
            'from':      payload.get('sender', 'Unknown'),
            'from_ip':   payload.get('sender_ip', request.remote_addr),
            'file_path': out_path,
            'encrypted': True,
            'status':    'received',
            'timestamp': __import__('datetime').datetime.now().strftime('%H:%M:%S')
        }
        chat_history.append(entry)
        log('system', 'file_received', f'File {payload["filename"]} from {entry["from"]}')
        return jsonify({'message': f'File received and decrypted: {out_path}'}), 200
    except Exception as e:
        log('system', 'file_receive_failed', str(e), 'error')
        return jsonify({'error': str(e)}), 400

@comm_bp.route('/api/comm/history', methods=['GET'])
def history():
    return jsonify(chat_history[-50:]), 200

@comm_bp.route('/api/comm/history', methods=['DELETE'])
def clear_history():
    chat_history.clear()
    return jsonify({'message': 'History cleared'}), 200

@comm_bp.route('/api/comm/ping', methods=['GET'])
def ping():
    return jsonify({'status': 'online', 'machine': os.uname().nodename}), 200

@comm_bp.route('/api/comm/connect', methods=['POST'])
def connect_to_peer():
    data = request.get_json()
    peer_ip = data.get('peer_ip', '')
    try:
        r = requests.get(f'http://{peer_ip}:5000/api/comm/ping', timeout=5)
        d = r.json()
        return jsonify({'status': 'connected', 'peer': d}), 200
    except:
        return jsonify({'error': f'Cannot reach {peer_ip}'}), 503
@comm_bp.route('/api/comm/unlock-message', methods=['POST'])
def unlock_message():
    data     = request.get_json()
    password = data.get('password', '')
    unlocked = []
    for entry in chat_history:
        if entry.get('locked'):
            # Re-decrypt with password
            try:
                content = entry['message']
                if 'LOCKED:' in str(entry.get('raw_payload', '')):
                    pass
                entry['locked']   = False
                entry['message']  = entry.get('original_content', entry['message'])
                unlocked.append(entry)
            except:
                return jsonify({'error': 'Wrong password'}), 403
    if not unlocked:
        return jsonify({'error': 'No locked messages found'}), 404
    return jsonify({'message': f'Unlocked {len(unlocked)} messages'}), 200

