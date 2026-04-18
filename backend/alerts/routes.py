from flask import Blueprint, request, jsonify
from backend.alerts.alert_manager import (
    create_alert, get_alerts,
    get_alert_stats, delete_alert, serialize_alert
)

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('/api/alerts', methods=['GET'])
def list_alerts():
    level = request.args.get('level')
    limit = int(request.args.get('limit', 100))
    alerts = get_alerts(level=level, limit=limit)
    return jsonify([serialize_alert(a) for a in alerts]), 200

@alerts_bp.route('/api/alerts', methods=['POST'])
def new_alert():
    data = request.get_json()
    level = data.get('level')
    message = data.get('message')
    source = data.get('source', 'manual')

    if not level or not message:
        return jsonify({'error': 'level and message required'}), 400

    try:
        alert = create_alert(level, message, source)
        return jsonify(serialize_alert(alert)), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@alerts_bp.route('/api/alerts/stats', methods=['GET'])
def stats():
    return jsonify(get_alert_stats()), 200

@alerts_bp.route('/api/alerts/<int:alert_id>', methods=['DELETE'])
def remove_alert(alert_id):
    if delete_alert(alert_id):
        return jsonify({'message': f'Alert {alert_id} deleted'}), 200
    return jsonify({'error': 'Alert not found'}), 404
