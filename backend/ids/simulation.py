import threading
import time
import math
import requests
from datetime import datetime

simulation_log = []
_stop_flag = threading.Event()

def log_event(event_type, message):
    simulation_log.append({
        'type': event_type,
        'message': message,
        'time': datetime.now().strftime('%H:%M:%S')
    })

def simulate_brute_force():
    log_event('brute_force', 'Brute force simulation started')
    passwords = ['123456','password','admin','letmein','qwerty','abc123']
    for pwd in passwords:
        if _stop_flag.is_set():
            break
        try:
            requests.post(
                'http://127.0.0.1:5000/api/login',
                json={'username': 'hacker', 'password': pwd},
                timeout=2
            )
            log_event('brute_force', f'Attempted password: {pwd}')
        except:
            pass
        time.sleep(0.5)
    log_event('brute_force', 'Brute force simulation completed')

def simulate_cpu_stress():
    log_event('anomaly', 'CPU stress simulation started')
    def burn():
        end = time.time() + 15
        while time.time() < end and not _stop_flag.is_set():
            sum(math.sqrt(i) for i in range(10000))
    threads = [threading.Thread(target=burn, daemon=True) for _ in range(4)]
    for t in threads:
        t.start()
    log_event('anomaly', 'CPU spike triggered — IDS should detect anomaly')

def simulate_suspicious_activity():
    log_event('suspicious', 'Suspicious activity simulation started')
    endpoints = [
        '/api/users', '/api/alerts', '/api/monitor/snapshot',
        '/api/ids/blocked', '/api/ids/attempts'
    ]
    for ep in endpoints:
        if _stop_flag.is_set():
            break
        try:
            requests.get(f'http://127.0.0.1:5000{ep}', timeout=2)
            log_event('suspicious', f'Probe: {ep}')
        except:
            pass
        time.sleep(0.3)
    log_event('suspicious', 'Suspicious activity simulation completed')

def run_simulation(sim_type):
    global _stop_flag
    _stop_flag = threading.Event()
    if sim_type == 'brute_force':
        t = threading.Thread(target=simulate_brute_force, daemon=True)
    elif sim_type == 'cpu_stress':
        t = threading.Thread(target=simulate_cpu_stress, daemon=True)
    elif sim_type == 'suspicious':
        t = threading.Thread(target=simulate_suspicious_activity, daemon=True)
    else:
        return False
    t.start()
    return True

def get_simulation_log(limit=20):
    return list(reversed(simulation_log[-limit:]))

def clear_simulation_log():
    simulation_log.clear()
