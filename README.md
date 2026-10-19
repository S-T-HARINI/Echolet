# EchoLet — Reliable Workshop Registration & Notification Delivery System

EchoLet is a production-grade workshop management and notification delivery platform designed to eliminate the distributed **dual-write problem**. When a member registers for a workshop or an organizer cancels an event, business state changes and external notifications must occur reliably. By implementing the **Transactional Outbox Pattern**, EchoLet decouples synchronous user requests from asynchronous network communication, guaranteeing that every persisted registration produces a notification without lost messages, double registrations, or ghost confirmations.

---

## 1. Project Overview & Architecture

### System Components

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend (:3000)                        │
│   (Member Catalog, Organizer Console, Outbox Monitor, Simulator UI)    │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        FastAPI Backend (:8000)       │  │ Mock Notification Svc (:8001)│
│  - Workshop & Member APIs            │  │  - Durable Delivery Storage  │
│  - Atomic Registration Transaction   │  │  - Fault Simulator (500/lag)│
│  - Outbox Event Generation           │  │  - Idempotency Deduplication │
└───────────────────┬──────────────────┘  └──────────────▲───────────────┘
                    │                                    │
                    │  Atomic Write                      │  HTTP POST (3s timeout)
                    ▼                                    │  Idempotency Key
┌──────────────────────────────────────┐                 │
│         Relational Database          │                 │
│  - workshops & registrations         │                 │
│  - notification_outbox (status, lock)│                 │
└───────────────────▲──────────────────┘                 │
                    │                                    │
                    │  Poll & Claim (Lease Locks)        │
┌───────────────────┴────────────────────────────────────┴───────────────┐
│                     Transactional Outbox Worker                        │
│   - Background Daemon, Exponential Backoff + Jitter, Auto-Recovery     │
└────────────────────────────────────────────────────────────────────────┘
```

- **Backend API (`backend/`)**: FastAPI application providing authenticated REST endpoints for workshop management, atomic registration with capacity checks, and cancellation fan-out.
- **Transactional Outbox Worker (`backend/app/worker/`)**: Independent Python daemon that polls the outbox, claims jobs via concurrency-safe leases, delivers notifications with bounded HTTP timeouts, and schedules retries.
- **Mock Notification Service (`mock_service/`)**: Standalone FastAPI service with persistent storage simulating external email/webhook delivery, equipped with runtime failure simulation (500 errors, latency delays, timeouts) and receiver-side idempotency deduplication.
- **Frontend Dashboard (`frontend/`)**: Modern Next.js 14 web application featuring a Member Catalog, Organizer Management Console, Failure Simulator controls, and a Live Outbox Inspection Monitor.

---

## 2. Source Code Structure

```
Echolet/
├── backend/
│   └── app/
│       ├── api/
│       │   └── v1/
│       │       ├── auth.py              # JWT authentication & session routes
│       │       ├── health.py            # System health & worker status checks
│       │       ├── notifications.py     # Outbox inspection & delivery queries
│       │       ├── registrations.py     # Registration endpoints
│       │       └── workshops.py         # Workshop creation, listing, cancellation
│       ├── auth/                        # Password hashing and token utilities
│       ├── models/
│       │   ├── outbox.py                # NotificationOutbox database model
│       │   ├── registration.py          # Registration database model
│       │   ├── user.py                  # User and authentication models
│       │   └── workshop.py              # Workshop database model
│       ├── schemas/                     # Pydantic request/response validation
│       ├── services/
│       │   ├── auth_service.py          # Authentication business logic
│       │   ├── registration_service.py  # Atomic registration & outbox write
│       │   └── workshop_service.py      # Workshop management & cancellation fan-out
│       ├── worker/
│       │   ├── outbox_worker.py         # Outbox claim, HTTP delivery & retry logic
│       │   └── runner.py                # Standalone worker daemon entry point
│       ├── config.py                    # Environment and application configuration
│       ├── database.py                  # Async SQLAlchemy engine & session factory
│       └── main.py                      # FastAPI application entry point
├── mock_service/
│   └── app/
│       ├── config.py                    # Mock service configuration
│       ├── database.py                  # SQLite database for recorded deliveries
│       ├── main.py                      # Delivery endpoint & simulator REST API
│       ├── schemas.py                   # Delivery & simulation schemas
│       └── simulator.py                 # In-memory failure simulation engine
├── frontend/
│   ├── src/
│   │   ├── app/                         # Next.js App Router & main layout
│   │   ├── components/
│   │   │   ├── views/                   # Catalog, Organizer, Outbox, Simulator views
│   │   │   └── ui/                      # Badges, buttons, modals, input elements
│   │   └── lib/                         # API client and authentication hooks
│   ├── package.json                     # Node.js dependencies & scripts
│   └── next.config.js                   # Next.js configuration & API rewrites
├── tests/                               # Comprehensive automated test suite
│   ├── test_atomicity.py                # ACID transactional boundary tests
│   ├── test_concurrency.py              # Concurrent registration & capacity limits
│   ├── test_idempotency.py              # Receiver and sender deduplication tests
│   ├── test_outbox_worker.py            # Polling, claiming, and lease management
│   ├── test_restart_recovery.py         # Persistence across backend restarts
│   └── test_retry_backoff.py            # Exponential backoff & jitter verification
├── alembic/                             # Database migrations
├── requirements.txt                     # Python dependencies
└── README.md                            # Documentation and run instructions
```

---

## 3. Run Instructions

### Prerequisites
- **Python**: 3.10, 3.11, 3.12, or 3.13
- **Node.js**: v18 or v20+ with `npm`

---

### Step 1: Install Dependencies

#### Python Backend & Mock Service
From the root directory of the project:
```bash
# Create and activate a virtual environment
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux / macOS:
source .venv/bin/activate

# Install required Python packages
pip install -r requirements.txt
```

#### Frontend
From the `frontend/` directory:
```bash
cd frontend
npm install
cd ..
```

---

### Step 2: Start the Services

To run the complete EchoLet system, launch the four components in separate terminal windows:

#### Terminal 1 — Backend API
```bash
# Windows / Linux / macOS (with virtualenv active)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
- **Service URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/api/v1/health`

#### Terminal 2 — Mock Notification Service
```bash
python -m uvicorn mock_service.app.main:app --host 127.0.0.1 --port 8001
```
- **Service URL**: `http://127.0.0.1:8001`
- **Health Check**: `http://127.0.0.1:8001/api/v1/health`
- **Deliveries API**: `http://127.0.0.1:8001/api/v1/deliveries`

#### Terminal 3 — Transactional Outbox Worker
```bash
python -m backend.app.worker.runner
```
- Continuously polls the outbox table and executes reliable notification dispatches.

#### Terminal 4 — Frontend Web Dashboard
```bash
cd frontend
npm run dev
```
- **Dashboard URL**: `http://localhost:3000`

---

### Step 3: Run the Automated Test Suite

EchoLet includes automated test suites verifying atomicity, concurrency, idempotency, retries, and worker behavior:

```bash
# Run all tests with verbose output
pytest -v
```

---

## 4. Reliability Architecture: Design & Guarantees

### 4.1 Handling Lost Notifications (Eliminating the Dual-Write Hazard)

#### The Problem
In standard web architectures, sending a notification immediately following a database write creates an unavoidable failure mode:
1. If the database commit succeeds but the HTTP call to the notification provider fails, times out, or crashes, the notification is permanently lost.
2. If the HTTP call succeeds but the local transaction fails to commit, the user receives a "ghost" confirmation for an action that never took place.

#### The Solution: Atomic Transactional Outbox
EchoLet completely decouples synchronous user requests from network delivery:
1. **Single ACID Transaction**: In [`registration_service.py`](backend/app/services/registration_service.py), the registration record and the corresponding `NotificationOutbox` event are persisted within the **exact same database transaction**:
   ```python
   async with session.begin():
       # 1. Atomic capacity check and reservation
       # 2. Persist Registration entity
       # 3. Persist NotificationOutbox event with status='PENDING'
   ```
2. **All-or-Nothing Guarantee**:
   - If capacity is exceeded or validation fails, the entire transaction rolls back. No registration is saved, and **no notification event is created**.
   - If the transaction commits, both the registration and the notification event are guaranteed to be durable on disk.
3. **Asynchronous Dispatch**: The API returns HTTP 201 immediately without making external network calls. The background Outbox Worker is responsible for picking up the durable outbox event and delivering it over HTTP.

---

### 4.2 Handling Retries (Exponential Backoff, Jitter & Leases)

#### Non-Blocking Asynchronous Processing
When external delivery fails, the user is never blocked or exposed to 500 errors because delivery happens asynchronously in the worker background loop.

#### Exponential Backoff with Jitter
When an HTTP delivery attempt encounters a network issue, timeout, or HTTP 5xx error:
1. The worker increments `attempt_count` and updates event status to `RETRYING`.
2. The `next_retry_at` timestamp is calculated using exponential backoff with full jitter:
   $$\text{delay} = \min\left(\text{max\_delay},\; \text{base\_delay} \times 2^{\text{attempt} - 1}\right) \times (1 \pm \text{jitter})$$
   - Default configuration: `base_delay = 2.0s`, `max_delay = 300.0s`, `jitter = ±10%`.
   - Jitter prevents the "thundering herd" problem by spreading retries across staggered intervals.
3. The event remains untouched in the outbox until `next_retry_at <= NOW()`.

#### Concurrency-Safe Worker Leases
To coordinate multiple worker instances without double processing:
1. The worker claims events by atomically setting `claimed_by = :worker_id` and `claim_expires_at = NOW() + lease_duration` (default 30 seconds).
2. Other workers skip locked/claimed rows.
3. If a worker process crashes mid-delivery, its lease expires automatically, and another healthy worker will safely reclaim the orphaned event.

#### Dead-Letter / Maximum Retries
If an event reaches the configured maximum retry threshold (default 10 attempts), it transitions to `FAILED` status and logs the last error payload for inspection, ensuring failed messages are never lost or silently discarded.

---

### 4.3 Handling Duplicate Delivery (Idempotency Keys & Deduplication)

#### The Problem: Ambiguous Network Failures
Over unreliable networks, "at-least-once" delivery can result in duplicate delivery attempts. For example, if the notification service receives a notification and persists it, but the network drops before returning the HTTP 200 response, the sender assumes failure and retries.

#### Sender-Side Deterministic Idempotency Keys
Every outbox event is generated with a deterministic, globally unique idempotency key:
- **Registration Confirmation**: `reg_{registration_id}`
- **Cancellation Notice**: `cancel_{workshop_id}_{member_id}`

A unique database constraint on `notification_outbox.idempotency_key` guarantees that the system cannot queue duplicate events for the same business action.

#### Receiver-Side Deduplication Storage
When the Outbox Worker calls the Mock Notification Service (`POST /api/v1/notify`), it includes `idempotency_key` in the payload:
1. The Mock Service checks its persistent `mock_deliveries` table for the incoming key.
2. **First Attempt**: The record is inserted into `mock_deliveries`, simulated failure conditions (if any) are applied, and HTTP 200 (`status: "delivered"`) is returned.
3. **Replay / Duplicate Attempt**: The service detects an existing record with the matching `idempotency_key`. It increments `attempt_seen_count`, sets `idempotent_replay: true`, and returns HTTP 200 immediately without duplicate side-effects.
4. The worker receives the 200 OK and marks the outbox event as `DELIVERED`.

---

### 4.4 Handling Backend Restarts (Crash Durability & Self-Healing)

#### Decoupled Architecture
The FastAPI API process, Mock Notification Service, and Outbox Worker are strictly separated:
- The API process does not hold in-memory notification queues.
- The Outbox Worker interacts only with the persistent relational database.

#### Crash Resilience
- If the Backend API process is restarted immediately after committing a registration, the registration and its `PENDING` outbox entry remain safely persisted in the relational database.
- When the worker polls the database, it queries:
  ```sql
  WHERE (status = 'PENDING' OR status = 'RETRYING')
    AND next_retry_at <= NOW()
    AND (claim_expires_at IS NULL OR claim_expires_at < NOW())
  ```
- Any unhandled or in-flight events that survived the restart are immediately discovered and dispatched.
- Even if the host machine experiences a sudden restart, all database records remain intact, and normal notification processing resumes as soon as the worker process starts.

---

## 5. Failure Simulator & Testing Controls

The project includes an interactive Failure Simulator accessible via the frontend dashboard or REST API (`http://127.0.0.1:8001/api/v1/simulate`):

| Simulation Mode | Description |
| :--- | :--- |
| **Normal Operation** | Clean delivery with 0ms injected delay and HTTP 200 responses. |
| **Simulated 500 Errors** | Injects HTTP 500 Internal Server Errors to test worker exponential backoff and retries. |
| **Simulated Latency / Timeouts** | Injects delays (e.g., 5 seconds) exceeding the worker HTTP timeout (3 seconds) to test timeout recovery. |
| **Flaky Delivery** | Introduces a configurable failure probability (e.g., 50%) to verify dynamic retry convergence. |
| **Targeted Recipient Faults** | Causes failures only for designated email addresses, allowing multi-user concurrency testing. |
