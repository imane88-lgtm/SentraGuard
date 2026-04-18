from collections import deque
from datetime import datetime
import psutil

# Rolling window of last N readings
WINDOW_SIZE = 20

cpu_history = deque(maxlen=WINDOW_SIZE)
ram_history = deque(maxlen=WINDOW_SIZE)

# Thresholds
CPU_THRESHOLD = 85.0
RAM_THRESHOLD = 85.0
CPU_SPIKE_DELTA = 40.0  # sudden jump detection

anomaly_log = []        # in-memory log

def collect_sample():
    cpu = psutil.cpu_percent(interval=1)
    ram = psutil.virtual_memory().percent
    ts = datetime.utcnow().isoformat()
    cpu_history.append(cpu)
    ram_history.append(ram)
    return cpu, ram, ts

def detect_anomalies():
    cpu, ram, ts = collect_sample()
    alerts = []

    # Threshold breach
    if cpu > CPU_THRESHOLD:
        alerts.append({
            'type': 'cpu_high',
            'level': 'critical',
            'value': cpu,
            'message': f'CPU usage critical: {cpu}%',
            'timestamp': ts
        })

    if ram > RAM_THRESHOLD:
        alerts.append({
            'type': 'ram_high',
            'level': 'critical',
            'value': ram,
            'message': f'RAM usage critical: {ram}%',
            'timestamp': ts
        })

    # Spike detection (sudden jump vs average)
    if len(cpu_history) >= 5:
        avg = sum(list(cpu_history)[:-1]) / (len(cpu_history) - 1)
        delta = cpu - avg
        if delta >= CPU_SPIKE_DELTA:
            alerts.append({
                'type': 'cpu_spike',
                'level': 'warning',
                'value': cpu,
                'delta': round(delta, 2),
                'message': f'CPU spike detected: +{round(delta,2)}% above average',
                'timestamp': ts
            })

    # Store in log
    for a in alerts:
        anomaly_log.append(a)

    return {
        'timestamp': ts,
        'cpu': cpu,
        'ram': ram,
        'alerts': alerts,
        'status': 'anomaly' if alerts else 'normal'
    }

def get_anomaly_log(limit=50):
    return list(reversed(anomaly_log[-limit:]))

def get_baseline():
    return {
        'cpu_avg': round(sum(cpu_history) / len(cpu_history), 2) if cpu_history else 0,
        'ram_avg': round(sum(ram_history) / len(ram_history), 2) if ram_history else 0,
        'samples': len(cpu_history)
    }
