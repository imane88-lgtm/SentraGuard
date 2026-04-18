# SentraGuard — Feature Documentation

## 1. Authentication
- Registration with input validation
- PBKDF2-SHA256 password hashing
- Server-side session management
- Last login timestamp tracking
- Role field (analyst / admin) for future RBAC

## 2. File Encryption
- Algorithm: AES-256-GCM
- Key size: 256 bits
- Nonce: 12 bytes random per operation
- Output: .enc file (nonce + ciphertext)
- Keys stored in /keys/ directory

## 3. System Monitoring
- CPU: usage %, core count, frequency
- RAM: total, used, usage %
- Disk: total, used, usage %
- Network: bytes sent/received
- Processes: top 10 by CPU usage

## 4. IDS — Brute Force Detection
- Tracks failed login attempts per IP
- Sliding window: 60 seconds
- Block threshold: 5 attempts
- Block duration: 5 minutes
- Integrated directly into login route

## 5. IDS — Anomaly Detection
- Samples CPU + RAM every scan
- Rolling baseline: last 20 readings
- Critical alert: >85% usage
- Warning alert: >40% spike delta
- In-memory anomaly log

## 6. Alert System
- Levels: info / warning / critical
- Persistent storage in SQLite
- Source tagging (system/ids/encryption/manual)
- REST API for create/read/delete
- Real-time display on dashboard

## 7. SOC Dashboard
- Dark professional theme
- 6 metric cards (CPU/RAM/Disk/Network/Alerts/IDS)
- Live alerts feed
- Top processes table
- IDS status panels
- File encryption panel
- Auto-refresh: 5 seconds
