# SentraGuard — Test Report

## Test 1: Authentication
| Test Case | Expected | Result |
|-----------|----------|--------|
| Register valid user | 201 Created | ✓ |
| Register duplicate user | 409 Conflict | ✓ |
| Register short password | 400 Bad Request | ✓ |
| Login valid credentials | 200 + session | ✓ |
| Login wrong password | 401 Unauthorized | ✓ |
| Access dashboard without login | Redirect /login | ✓ |
| Logout clears session | Redirect /login | ✓ |

## Test 2: Brute Force Detection
| Test Case | Expected | Result |
|-----------|----------|--------|
| 4 failed attempts | Warning with remaining count | ✓ |
| 5th failed attempt | IP blocked (429) | ✓ |
| Request while blocked | Blocked message + until time | ✓ |
| Block expires after 5min | Login allowed again | ✓ |

## Test 3: File Encryption
| Test Case | Expected | Result |
|-----------|----------|--------|
| Generate AES key | .key file created | ✓ |
| Encrypt file | .enc file created | ✓ |
| Decrypt file | Original content restored | ✓ |
| Wrong key decrypt | Exception raised | ✓ |

## Test 4: System Monitoring
| Test Case | Expected | Result |
|-----------|----------|--------|
| Snapshot endpoint | All metrics returned | ✓ |
| CPU under load | Higher % reported | ✓ |
| Process list | Top 10 by CPU | ✓ |

## Test 5: Anomaly Detection
| Test Case | Expected | Result |
|-----------|----------|--------|
| Normal system | status: normal | ✓ |
| Stress simulation | CPU spike detected | ✓ |
| Baseline builds over 20 samples | Accurate avg | ✓ |

## Test 6: Alert System
| Test Case | Expected | Result |
|-----------|----------|--------|
| Create info alert | 201 + stored in DB | ✓ |
| Create critical alert | 201 + stored in DB | ✓ |
| Filter by level | Correct subset | ✓ |
| Stats endpoint | Correct counts | ✓ |
| Delete alert | Removed from DB | ✓ |

## Simulation Scripts
| Script | Purpose | Status |
|--------|---------|--------|
| brute_force_sim.py | Test IDS blocking | ✓ Working |
| stress_sim.py | Trigger anomaly alerts | ✓ Working |
| detection_test.py | Full system test | ✓ Working |
