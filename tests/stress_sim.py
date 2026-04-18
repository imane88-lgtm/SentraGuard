import threading
import time
import math

DURATION = 30       # seconds
THREADS = 6

stop_flag = threading.Event()

def cpu_burn():
    print(f"[THREAD] CPU stress started")
    while not stop_flag.is_set():
        # Pure CPU burn
        x = 0
        for i in range(1, 100000):
            x += math.sqrt(i) * math.sin(i)

def ram_fill():
    print(f"[THREAD] RAM stress started")
    chunks = []
    try:
        while not stop_flag.is_set():
            chunks.append(' ' * 10_000_000)  # ~10MB per chunk
            time.sleep(0.3)
    except MemoryError:
        print("[THREAD] RAM limit reached")
    finally:
        del chunks

def run_stress():
    print(f"\n[SentraGuard] Stress Simulation Starting")
    print(f"[DURATION] {DURATION}s  [THREADS] {THREADS}")
    print("[WARNING] This will spike your CPU/RAM — IDS should detect it")
    print("-" * 50)

    threads = []

    # CPU threads
    for i in range(THREADS - 1):
        t = threading.Thread(target=cpu_burn, daemon=True)
        t.start()
        threads.append(t)

    # 1 RAM thread
    t = threading.Thread(target=ram_fill, daemon=True)
    t.start()
    threads.append(t)

    print(f"[RUNNING] Stress active for {DURATION} seconds...")
    print("[ACTION]  Watch your dashboard for anomaly alerts!")
    time.sleep(DURATION)

    stop_flag.set()
    print("-" * 50)
    print("[SentraGuard] Stress simulation ended\n")

if __name__ == '__main__':
    run_stress()
