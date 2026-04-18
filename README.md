# SentraGuard — Local Cybersecurity Application
**Branding:** nothing
**Type:** Final Year Project (PFE) — Local Security Operations Center  
**Stack:** Python 3, Flask, SQLite, HTML/CSS/JS  
**Platform:** Kali Linux  

---

## Features
| Module | Description |
|--------|-------------|
| Authentication | Register/Login with bcrypt hashing + session management |
| IDS — Brute Force | IP-based detection, auto-block after 5 failures |
| IDS — Anomaly | CPU/RAM spike detection with rolling baseline |
| File Encryption | AES-256-GCM encrypt/decrypt with key management |
| System Monitor | Real-time CPU, RAM, Disk, Network, Processes |
| Alert System | Info/Warning/Critical alerts with persistent DB logging |
| SOC Dashboard | Professional dark UI, auto-refresh every 5s |

---

## Project Structure
SentraGuard/
├── app.py                  # Flask entry point
├── config.py               # App configuration
├── backend/
│   ├── auth/               # Auth routes + User model
│   ├── encryption/         # AES-256-GCM module
│   ├── monitoring/         # psutil system monitor
│   ├── ids/                # Brute force + anomaly detection
│   └── alerts/             # Alert manager + DB logging
├── frontend/
│   ├── templates/          # login.html + dashboard.html
│   └── static/             # dashboard.js + encryption.js
├── tests/                  # Attack simulation scripts
├── docs/                   # Project documentation
├── logs/                   # Log storage
└── keys/                   # AES key storage

## Quick Start
```bash
git clone <repo>
cd SentraGuard
python3 -m venv venv
source venv/bin/activate
pip install flask flask-sqlalchemy flask-session cryptography psutil werkzeug
python3 app.py
```
Open: http://127.0.0.1:5000

## Default Credentials
- Username: `admin`
- Password: `admin123`

## Attack Simulations
```bash
# Brute force simulation
python3 tests/brute_force_sim.py

# System stress test (triggers anomaly IDS)
python3 tests/stress_sim.py

# Full detection test
python3 tests/detection_test.py
```

## Security Notes
- Passwords hashed with Werkzeug PBKDF2-SHA256
- Files encrypted with AES-256-GCM (authenticated encryption)
- Sessions server-side only
- IDS blocks IPs for 5 minutes after 5 failed attempts

---
*Built as a PFE project — Cybersecurity Engineering*
