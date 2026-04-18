from flask import Blueprint, jsonify
from backend.auth.models import User

users_bp = Blueprint('users', __name__)

@users_bp.route('/api/users', methods=['GET'])
def list_users():
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'role': u.role,
        'created_at': u.created_at.isoformat() if u.created_at else None,
        'last_login': u.last_login.isoformat() if u.last_login else None
    } for u in users]), 200
