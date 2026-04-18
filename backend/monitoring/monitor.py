import psutil
from datetime import datetime

def get_cpu():
    return {
        'percent': psutil.cpu_percent(interval=1),
        'cores': psutil.cpu_count(),
        'freq_mhz': round(psutil.cpu_freq().current, 2)
    }

def get_ram():
    ram = psutil.virtual_memory()
    return {
        'total_gb': round(ram.total / 1e9, 2),
        'used_gb': round(ram.used / 1e9, 2),
        'percent': ram.percent
    }

def get_disk():
    disk = psutil.disk_usage('/')
    return {
        'total_gb': round(disk.total / 1e9, 2),
        'used_gb': round(disk.used / 1e9, 2),
        'percent': disk.percent
    }

def get_processes(limit=10):
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
        try:
            procs.append(p.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    procs.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
    return procs[:limit]

def get_network():
    net = psutil.net_io_counters()
    return {
        'bytes_sent_mb': round(net.bytes_sent / 1e6, 2),
        'bytes_recv_mb': round(net.bytes_recv / 1e6, 2)
    }

def get_snapshot():
    return {
        'timestamp': datetime.utcnow().isoformat(),
        'cpu': get_cpu(),
        'ram': get_ram(),
        'disk': get_disk(),
        'network': get_network(),
        'top_processes': get_processes()
    }

