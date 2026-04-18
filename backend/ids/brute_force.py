from collections import defaultdict
from datetime import datetime, timedelta

# Storage: {ip: [timestamp, ...]}
failed_attempts = defaultdict(list)

THRESHOLD = 5        # max failed attempts
WINDOW_SEC = 60      # within this many seconds
BLOCK_SEC = 300      # block duration

blocked_ips = {}     # {ip: blocked_until}

def record_failed_attempt(ip: str):
    now = datetime.utcnow()
    failed_attempts[ip].append(now)
    # Keep only attempts within window
    failed_attempts[ip] = [
        t for t in failed_attempts[ip]
        if now - t <= timedelta(seconds=WINDOW_SEC)
    ]

def is_blocked(ip: str) -> bool:
    if ip in blocked_ips:
        if datetime.utcnow() < blocked_ips[ip]:
            return True
        else:
            del blocked_ips[ip]
    return False

def check_brute_force(ip: str) -> dict:
    if is_blocked(ip):
        return {
            'status': 'blocked',
            'message': f'IP {ip} is blocked',
            'until': blocked_ips[ip].isoformat()
        }

    count = len(failed_attempts[ip])

    if count >= THRESHOLD:
        blocked_ips[ip] = datetime.utcnow() + timedelta(seconds=BLOCK_SEC)
        return {
            'status': 'blocked',
            'message': f'Brute force detected from {ip}',
            'attempts': count,
            'until': blocked_ips[ip].isoformat()
        }

    return {
        'status': 'ok',
        'attempts': count,
        'remaining': THRESHOLD - count
    }

def get_all_blocked():
    now = datetime.utcnow()
    return [
        {'ip': ip, 'until': until.isoformat()}
        for ip, until in blocked_ips.items()
        if now < until
    ]

def get_attempts_summary():
    return {
        ip: len(times)
        for ip, times in failed_attempts.items()
        if times
    }
