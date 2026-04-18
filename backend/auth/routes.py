from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from backend.auth.models import db, User
from backend.ids.brute_force import record_failed_attempt, check_brute_force

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if len(username) < 3 or len(password) < 6:
        return jsonify({'error': 'Username min 3 chars, password min 6'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'User already exists'}), 409

    hashed = generate_password_hash(password)
    user = User(username=username, password_hash=hashed)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': f'User {username} registered successfully'}), 201

@auth_bp.route('/api/login', methods=['POST'])
def login():
    ip = request.remote_addr
    bf = check_brute_force(ip)
    if bf['status'] == 'blocked':
        return jsonify({'error': 'Too many failed attempts', 'detail': bf}), 429

    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password_hash, password):
        record_failed_attempt(ip)
        bf = check_brute_force(ip)
        return jsonify({'error': 'Invalid credentials', 'detail': bf}), 401

    user.last_login = datetime.utcnow()
    db.session.commit()

    session['user'] = user.username
    session['role'] = user.role

    return jsonify({
        'message': 'Login successful',
        'username': user.username,
        'role': user.role
    }), 200

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'}), 200

@auth_bp.route('/api/me', methods=['GET'])
def me():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify({'username': session['user'], 'role': session['role']}), 200
