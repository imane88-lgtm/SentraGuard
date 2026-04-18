from flask import Blueprint, jsonify
from backend.monitoring.monitor import get_snapshot, get_cpu, get_ram, get_processes

mon_bp = Blueprint('monitoring', __name__)

@mon_bp.route('/api/monitor/snapshot', methods=['GET'])
def snapshot():
    return jsonify(get_snapshot()), 200

@mon_bp.route('/api/monitor/cpu', methods=['GET'])
def cpu():
    return jsonify(get_cpu()), 200

@mon_bp.route('/api/monitor/ram', methods=['GET'])
def ram():
    return jsonify(get_ram()), 200

@mon_bp.route('/api/monitor/processes', methods=['GET'])
def processes():
    return jsonify(get_processes()), 200
