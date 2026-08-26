# 🏋️ Gym Slot Booking System

<p align="left">
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/Express.js-5.0-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-16.0-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/MongoDB-7.0-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Redis-7.0-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
</p>

A production-ready full-stack gym reservation platform designed to eliminate overbooking under heavy concurrent traffic. Built with **React 19**, **Node.js/Express 5**, **PostgreSQL 16**, **MongoDB 7**, **Redis 7**, and containerized infrastructure via **Docker Compose**.

This system implements a multi-database architecture where **PostgreSQL** serves as the transactional source of truth, **MongoDB** logs asynchronous audit trails and notification history, and **Redis** handles hot-read caching and booking rate limiting.

---

## 📌 Key Highlights

- **Concurrency-Safe Engine**: Employs PostgreSQL atomic conditional updates (`UPDATE ... WHERE booked_count < capacity`) inside serialized transactions to strictly enforce the 10-person slot capacity limit under high concurrent bursts.
- **Dual-Database Architecture**: PostgreSQL functions as the ACID transactional source of truth; MongoDB handles asynchronous non-blocking activity logs (`activity_logs`) and notification history (`notification_history`).
- **Low-Latency Read Path**: High-frequency slot availability queries are cached in Redis (`slot:{slotId}:available`) with immediate post-commit invalidation upon bookings or cancellations.
- **Layered Service Architecture**: Strict separation of concerns (Routes → Middleware → Controllers → Database Clients).
- **Graceful Lifecycle Management**: Clean connection pool draining, Redis teardown, fail-open cache resiliency, and centralized error sanitization.

---

## ✅ Assignment Compliance

This project fulfills all mandatory technology stack requirements:

| Requirement | Implementation | Responsibility |
| :--- | :--- | :--- |
| **React.js** | React 19 + Vite + React Router v7 | Single Page Application (SPA) frontend UI |
| **Node.js** | Node.js (v20+) runtime | Backend server runtime |
| **Express.js** | Express REST API | Routing, controller logic, middleware pipeline |
| **PostgreSQL** | PostgreSQL 16 (Docker) | Primary transactional database & authoritative source of truth |
| **MongoDB** | MongoDB 7 (Docker) | Secondary non-transactional store (`activity_logs` & `notification_history`) |
| **Redis** | Redis 7 (Docker) | Hot-read available-capacity caching & booking rate limiting |
| **JWT** | `jsonwebtoken` | Bearer token authentication |
| **bcrypt** | `bcrypt` | Password hashing (salt rounds = 10) |
| **Joi** | `joi` | Strict backend request input validation |
| **Docker Compose** | `docker-compose.yml` | Local containerized infrastructure (PostgreSQL, MongoDB, Redis) |

> [!IMPORTANT]
> **Docker Infrastructure Scope**: Docker Compose is used **ONLY** for containerizing the database and caching services (`gym-postgres`, `gym-mongo`, `gym-redis`). The React frontend and Node.js/Express backend run natively on the host machine. This design matches the assignment specification.

---

## 🏛 System Architecture

### Request Processing Pipeline

```
[ Browser / React SPA ]
         │ (HTTP REST / JSON)
         ▼
[ Express API Server ]
         │
         ├── 1. Auth Middleware (JWT Verification)
         ├── 2. Validation Middleware (Joi Schemas)
         ├── 3. Rate Limiter Middleware (Redis Fixed-Window)
         │
         ▼
[ Controller / Business Logic ]
         │
         ├── 4. Primary Transaction (PostgreSQL) ──► [users / gym_slots / bookings]
         │        (BEGIN -> UPDATE ... WHERE booked_count < capacity -> COMMIT)
         │
         ├── 5. Cache Invalidation (Redis) ──────► [slot:{slotId}:available]
         ├── 6. Audit Logging (MongoDB) ─────────► [activity_logs]
         └── 7. Notification History (MongoDB) ──► [notification_history]
```

### High-Level Design (HLD) Flowchart

```mermaid
flowchart LR
    subgraph Client
        A[React.js SPA]
    end

    subgraph API["API Layer — Node.js + Express"]
        B[Auth Middleware - JWT]
        C[Validation Middleware]
        D[Rate Limiter]
        E[Slot Controller]
        F[Booking Controller]
    end

    subgraph Cache["Redis"]
        G[(Available-Capacity Cache)]
        H[(Rate-Limit Counters)]
    end

    subgraph Primary["PostgreSQL - Source of Truth"]
        I[(users)]
        J[(gym_slots)]
        K[(bookings)]
    end

    subgraph Secondary["MongoDB - Non-Transactional"]
        L[(activity_logs)]
        M[(notification_history)]
    end

    A -->|HTTPS/JSON| B --> C --> D --> E
    D --> F
    E -->|read-through cache| G
    F -->|atomic conditional UPDATE| J
    F --> K
    F -->|invalidate on write| G
    D -->|check/incr| H
    F -.async fire-and-forget.-> L
    F -.async.-> M
```

---

## 🔒 Concurrency Strategy & Race Condition Prevention

### The Challenge
When a gym slot has **1 spot remaining** (`booked_count = 9`, `capacity = 10`) and multiple users attempt to book at the exact same millisecond:
- **Unsafe systems** read `booked_count = 9` across all threads simultaneously, approve all reservations, and overbook the slot to `12` or higher.
- **Gym Slot Booking System** serializes write attempts at the database level using atomic conditional updates.

### Execution Flow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor UserA as User A
    actor UserB as User B
    participant DB as PostgreSQL (Transaction)
    
    UserA->>DB: BEGIN Transaction
    UserB->>DB: BEGIN Transaction
    
    UserA->>DB: SELECT capacity, booked_count FROM gym_slots WHERE id = $1
    UserB->>DB: SELECT capacity, booked_count FROM gym_slots WHERE id = $1
    
    UserA->>DB: UPDATE gym_slots SET booked_count = booked_count + 1 WHERE id = $1 AND booked_count < capacity
    Note over DB: User A update succeeds (9 -> 10). 1 Row Affected.
    
    UserA->>DB: INSERT INTO bookings (user_id, slot_id, status) VALUES (...)
    UserA->>DB: COMMIT Transaction
    Note over UserA,DB: User A receives HTTP 201 Created
    
    UserB->>DB: UPDATE gym_slots SET booked_count = booked_count + 1 WHERE id = $1 AND booked_count < capacity
    Note over DB: Capacity check fails (10 < 10 is FALSE). 0 Rows Affected.
    
    UserB->>DB: ROLLBACK Transaction
    Note over UserB,DB: User B rejected with HTTP 409 Conflict (SLOT_FULL)
```

### SQL Transaction Implementation

```sql
BEGIN;

-- 1. Verify slot exists and fetch capacity
SELECT id, capacity, booked_count FROM gym_slots WHERE id = $1;

-- 2. Verify active booking does not already exist for user
SELECT id FROM bookings WHERE user_id = $2 AND slot_id = $1 AND status = 'confirmed';

-- 3. Atomically increment booked_count IF capacity permits
UPDATE gym_slots
SET booked_count = booked_count + 1
WHERE id = $1
  AND booked_count < capacity
RETURNING booked_count;

-- If 0 rows returned => ROLLBACK & return HTTP 409 Conflict ("SLOT_FULL")

-- 4. Record confirmed booking
INSERT INTO bookings (user_id, slot_id, status)
VALUES ($2, $1, 'confirmed');

COMMIT;
```

### Duplicate Active Booking Prevention
A partial unique index at the PostgreSQL level enforces that a single user cannot hold multiple confirmed reservations for the same slot:

```sql
CREATE UNIQUE INDEX uq_active_booking_per_user_slot
ON bookings (user_id, slot_id)
WHERE status = 'confirmed';
```

---

## 🗃 Database Roles & Schemas

### 1. PostgreSQL (Transactional Source of Truth)

```
users (id, name, email, password_hash, role, created_at)
  │
  ├──< bookings (id, user_id, slot_id, status, booked_at, cancelled_at)
  │
gym_slots (id, slot_date, start_time, end_time, capacity, booked_count, created_at)
```

| Table | Primary Key | Key Columns & Indexes | Description |
| :--- | :--- | :--- | :--- |
| `users` | `id` (UUID) | `email` (UNIQUE) | User identity and password credentials |
| `gym_slots` | `id` (UUID) | `slot_date`, `start_time`, `booked_count` | Gym slots (Default capacity: 10, `CHECK (booked_count <= capacity)`) |
| `bookings` | `id` (UUID) | `uq_active_booking_per_user_slot` partial index | Reservation records (`confirmed` or `cancelled`) |

---

### 2. MongoDB (Audit & Activity Collections)

#### `activity_logs` Collection (`backend/src/models/mongo/activityLog.js`)
```json
{
  "_id": "ObjectId('6a8e03c348f509ee228c044d')",
  "userId": "d994d73f-0f6b-4699-9c09-bcf04d507203",
  "action": "booking_created",
  "slotId": "3818c0c1-1dd7-4faf-ab13-c5874d43eb8d",
  "timestamp": "2026-08-26T12:00:00.000Z",
  "metadata": {
    "ip": "127.0.0.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

#### `notification_history` Collection (`backend/src/models/mongo/notification.js`)
```json
{
  "_id": "ObjectId('6a8e03c348f509ee228c044e')",
  "userId": "d994d73f-0f6b-4699-9c09-bcf04d507203",
  "channel": "email",
  "message": "Your gym slot booking was confirmed.",
  "sentAt": "2026-08-26T12:00:00.000Z",
  "status": "sent"
}
```

---

### 3. Redis (Caching & Rate Limiting)

- **Slot Availability Cache**:
  - Key Pattern: `slot:{slotId}:available`
  - Strategy: Cache-Aside with 10s TTL, invalidated (`DEL`) immediately post-commit on bookings/cancellations.
  - Fail-Open: If Redis is offline, queries gracefully fall back to PostgreSQL.

- **Booking Rate Limiter**:
  - Key Pattern: `ratelimit:booking:{userId}`
  - Window: Fixed-window 60 seconds
  - Limit: 10 booking requests per 60 seconds per user
  - Response: `429 Too Many Requests` with `Retry-After: 60` header.

---

## ⚡ Redis Caching & Invalidation Flow

- **Cache-Aside Pattern**: `GET /api/slots?date=YYYY-MM-DD` checks Redis key `slot:{slotId}:available` before querying PostgreSQL.
- **TTL**: Keys expire automatically after 10 seconds.
- **Write Invalidation**: Upon any successful booking or cancellation, `slot:{slotId}:available` is invalidated immediately.
- **Resilience**: If Redis experiences latency or outage, queries automatically fall back to PostgreSQL without disrupting user operations.

---

## 📡 REST API Reference

### Base URL
`http://localhost:3000/api`

### Endpoints

| Method | Route | Description | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register new member account | No |
| `POST` | `/api/auth/login` | Authenticate credentials and receive Bearer JWT | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | **Yes** |
| `GET` | `/api/slots?date=YYYY-MM-DD` | List slots with live capacity meters (Cached) | **Yes** |
| `POST` | `/api/bookings` | Reserve a gym slot (Row-locked, Rate-limited) | **Yes** |
| `GET` | `/api/bookings` | Retrieve booking history of authenticated user | **Yes** |
| `DELETE` | `/api/bookings/:id` | Cancel reservation & restore slot capacity | **Yes** |

---

## 💻 Frontend Application

The frontend is a single-page application built with **React 19**, **Vite**, and **React Router v7**.

### Key Pages & Features
- **`/login` & `/register`**: Authenticated forms with validation error feedback and JWT session management.
- **`/slots`**: Interactive date picker, real-time `Capacity`, `Booked`, and `Available` counters. "Book Slot" buttons dynamically disable when slots are full (`available === 0`) or when the user holds an active reservation.
- **`/bookings`**: Personal booking history displaying active/cancelled badges, timestamps, and confirmation modal dialogs for cancellation.
- **Route Guards**: `ProtectedRoute` protects `/slots` and `/bookings`; `PublicOnlyRoute` redirects logged-in users away from auth pages.

---

## 🛠 Local Setup & Execution Guide

### Prerequisites
- [Docker Desktop](https://www.docker.com/) (running locally)
- [Node.js](https://nodejs.org/) (v20+)
- [npm](https://www.npmjs.com/) (v10+)

### 1. Clone Repository
```bash
git clone https://github.com/manyapatkar974/GYM_SLOT.git
cd GYM_SLOT
```

### 2. Start Infrastructure Services
Launch PostgreSQL, MongoDB, and Redis in isolated Docker containers:
```bash
docker compose up -d
```

Verify infrastructure container status:
```bash
docker compose ps
```
*Expected output: `gym-postgres` (healthy), `gym-mongo` (Up), `gym-redis` (Up).*

### 3. Backend Setup
```bash
cd backend
npm install

# Create local environment file
cat <<EOT > .env
DATABASE_URL=postgres://gymuser:gympassword@localhost:5432/gymbooking
MONGO_URL=mongodb://localhost:27017/gymbooking
REDIS_URL=redis://localhost:6379
JWT_SECRET=gymbooking_jwt_secret_key_2026_super_secure
PORT=3000
EOT

# Seed initial gym slots (for 2026-08-27)
node src/seed/seedSlots.js

# Start backend server
npm start
```
*Backend runs on `http://localhost:3000`.*

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install

# Create local environment file
cat <<EOT > .env
VITE_API_BASE_URL=http://localhost:3000
EOT

# Start Vite dev server
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🧪 Concurrency Stress Testing & Verification

The repository was stress-tested under high concurrent load with **25 simultaneous user booking requests** against a slot with capacity **10**.

```
📊 Concurrent Request Execution Results (25 Concurrent Users -> Capacity 10):
┌─────────┬──────────────────────┬─────────┬─────────────────────────────────┐
│ Status  │     HTTP Code        │ Count   │            Outcome              │
├─────────┼──────────────────────┼─────────┼─────────────────────────────────┤
│ SUCCESS │ 201 Created          │   10    │ Bookings Confirmed              │
│ REJECTED│ 409 Conflict         │   15    │ SLOT_FULL Code Returned         │
└─────────┴──────────────────────┴─────────┴─────────────────────────────────┘

🔍 Database Integrity Verification:
   - Expected Confirmed Bookings: 10 | Actual in PostgreSQL: 10
   - Slot Booked Count in Database: 10 / 10
   - Overbooking Instances: 0

✅ TEST PASSED: Zero overbooking detected. Database-level concurrency control verified!
```

---

## ⚖️ Design Decisions & Trade-offs

| Decision | Rationale | Trade-off |
| :--- | :--- | :--- |
| **Native `pg` Pool over ORM** | Guarantees direct control over explicit transaction lifecycle and atomic SQL queries without ORM abstraction overhead. | Requires writing clean parameterized SQL queries instead of ORM methods. |
| **Dual Database Pattern** | Decouples high-volume audit logging (MongoDB) from transactional operations (PostgreSQL). | Maintains two database instances locally via Docker. |
| **Atomic Conditional Updates** | Guarantees strict serialization under peak booking load without complex application retry loops. | Requires careful SQL error handling on 0 affected rows. |
| **Non-Blocking Side Effects** | Redis cache invalidation, MongoDB logs, and notification history execute post-commit. | Side-effect failures do not roll back successful PostgreSQL booking transactions. |

---

## 📈 Scalability to 100x Traffic

To scale this platform for enterprise production loads:
1. **Stateless API Clustering**: Deploy multiple Node.js/Express API instances behind an Application Load Balancer (ALB / NGINX).
2. **PostgreSQL Read Replicas & Connection Pooling**: Deploy **PgBouncer** to pool database connections and direct read-only queries to PostgreSQL read replicas.
3. **Distributed Redis Cluster**: Shard Redis availability cache and rate-limit counters across a multi-node Redis Cluster.
4. **Asynchronous Message Queue**: Offload post-commit MongoDB audit logging and notification distribution to a dedicated queue worker (BullMQ / RabbitMQ).

---

## 📄 License

This project is open-source and available under the [ISC License](LICENSE).
