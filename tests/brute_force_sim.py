import requests
import time
import sys

TARGET = "http://127.0.0.1:5000/api/login"
USERNAME = "admin"
PASSWORDS = [
    "123456", "password", "admin", "letmein",
    "qwerty", "abc123", "monkey", "master",
    "dragon", "admin123"
]

def run_brute_force(delay=0.5):
    print(f"\n[SentraGuard] Brute Force Simulation Starting")
    print(f"[TARGET] {TARGET}")
    print(f"[USER]   {USERNAME}")
    print("-" * 50)

    for i, pwd in enumerate(PASSWORDS, 1):
        try:
            r = requests.post(TARGET, json={
                "username": USERNAME,
                "password": pwd
            })
            status = r.status_code
            data = r.json()

            if status == 200:
                print(f"[{i:02d}] PASSWORD FOUND: {pwd} ✓")
                break
            elif status == 429:
                print(f"[{i:02d}] BLOCKED by IDS ✗ — {data.get('error')}")
                print(f"      Detail: {data.get('detail',{}).get('message','')}")
                break
            else:
                remaining = data.get('detail', {}).get('remaining', '?')
                print(f"[{i:02d}] FAILED: {pwd:<15} | attempts left before block: {remaining}")

            time.sleep(delay)

        except requests.ConnectionError:
            print("[ERROR] Cannot connect to SentraGuard")
            sys.exit(1)

    print("-" * 50)
    print("[SentraGuard] Simulation complete\n")

if __name__ == '__main__':
    run_brute_force()
