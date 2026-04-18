# SentraGuard — System Architecture

## Overview
SentraGuard is a local cybersecurity application built on a
monolithic Flask architecture with modular backends.

## Architecture Diagram
Browser (UI)
│
▼
Flask App (app.py)
│
├── /api/auth/*        → backend/auth/
│      └── SQLite DB (User, AlertLog)
│
├── /api/monitor/*     → backend/monitoring/
│      └── psutil (OS-level metrics)
│
├── /api/ids/*         → backend/ids/
│      ├── brute_force.py (in-memory IP tracker)
│      └── anomaly.py (rolling window detector)
│
├── /api/encryption/*  → backend/encryption/
│      └── AES-256-GCM (cryptography library)
│
└── /api/alerts/*      → backend/alerts/
└── SQLite DB (AlertLog)

## Key Design Decisions

### 1. AES-256-GCM
- Authenticated encryption (integrity + confidentiality)
- Random 12-byte nonce per encryption
- Keys stored separately in /keys/

### 2. Brute Force Detection
- In-memory sliding window (60s)
- Threshold: 5 attempts → 5 min block
- IP-based tracking

### 3. Anomaly Detection
- Rolling average over last 20 samples
- Threshold breach: >85% CPU or RAM
- Spike detection: >40% sudden jump

### 4. Session Management
- Flask server-side sessions
- Protected routes redirect to /login
- Logout clears session completely

## API Endpoints Summary
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/register | Create user |
| POST | /api/login | Authenticate |
| POST | /api/logout | End session |
| GET  | /api/me | Session info |
| GET  | /api/monitor/snapshot | Full system snapshot |
| GET  | /api/ids/anomaly/scan | Run anomaly scan |
| GET  | /api/ids/blocked | List blocked IPs |
| POST | /api/encryption/encrypt | Encrypt file |
| POST | /api/encryption/decrypt | Decrypt file |
| GET  | /api/alerts | List alerts |
| GET  | /api/alerts/stats | Alert statistics |
