from flask import Blueprint, jsonify
from backend.ids.brute_force import get_all_blocked, get_attempts_summary
from backend.ids.anomaly import detect_anomalies, get_anomaly_log, get_baseline

ids_bp = Blueprint('ids', __name__)

@ids_bp.route('/api/ids/blocked', methods=['GET'])
def blocked():
    return jsonify(get_all_blocked()), 200

@ids_bp.route('/api/ids/attempts', methods=['GET'])
def attempts():
    return jsonify(get_attempts_summary()), 200

@ids_bp.route('/api/ids/anomaly/scan', methods=['GET'])
def anomaly_scan():
    return jsonify(detect_anomalies()), 200

@ids_bp.route('/api/ids/anomaly/log', methods=['GET'])
def anomaly_log():
    return jsonify(get_anomaly_log()), 200

@ids_bp.route('/api/ids/anomaly/baseline', methods=['GET'])
def baseline():
    return jsonify(get_baseline()), 200
