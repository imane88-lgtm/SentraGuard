import requests
import time

BASE = "http://127.0.0.1:5000"

def check(label, url, method='GET', data=None):
    try:
        if method == 'POST':
            r = requests.post(url, json=data)
        else:
            r = requests.get(url)
        status = "✓ PASS" if r.status_code < 500 else "✗ FAIL"
        print(f"  {status} [{r.status_code}] {label}")
        return r.json()
    except Exception as e:
        print(f"  ✗ ERROR {label}: {e}")
        return {}

def run_detection_test():
    print("\n[SentraGuard] Detection System Test")
    print("=" * 50)

    print("\n[1] AUTH ENDPOINTS")
    check("Register new user",  f"{BASE}/api/register", 'POST',
          {"username":"testuser99","password":"test123"})
    check("Valid login",        f"{BASE}/api/login",    'POST',
          {"username":"admin","password":"admin123"})
    check("Invalid login",      f"{BASE}/api/login",    'POST',
          {"username":"admin","password":"wrongpass"})

    print("\n[2] MONITORING ENDPOINTS")
    check("Snapshot",    f"{BASE}/api/monitor/snapshot")
    check("CPU",         f"{BASE}/api/monitor/cpu")
    check("RAM",         f"{BASE}/api/monitor/ram")
    check("Processes",   f"{BASE}/api/monitor/processes")

    print("\n[3] IDS ENDPOINTS")
    check("Anomaly scan",  f"{BASE}/api/ids/anomaly/scan")
    check("Anomaly log",   f"{BASE}/api/ids/anomaly/log")
    check("Baseline",      f"{BASE}/api/ids/anomaly/baseline")
    check("Blocked IPs",   f"{BASE}/api/ids/blocked")

    print("\n[4] ALERT ENDPOINTS")
    check("Create info alert",     f"{BASE}/api/alerts", 'POST',
          {"level":"info","message":"Detection test running","source":"test"})
    check("Create critical alert", f"{BASE}/api/alerts", 'POST',
          {"level":"critical","message":"Simulated attack detected","source":"test"})
    check("Get all alerts",        f"{BASE}/api/alerts")
    stats = check("Alert stats",   f"{BASE}/api/alerts/stats")

    print("\n[5] SUMMARY")
    print(f"  Total alerts in DB: {stats.get('total', '?')}")
    print(f"  Critical:           {stats.get('critical', '?')}")
    print("=" * 50)
    print("[SentraGuard] Test complete\n")

if __name__ == '__main__':
    run_detection_test()
