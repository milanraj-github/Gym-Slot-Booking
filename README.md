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

---

## 1. Project Overview

The **Gym Slot Booking System** enables authenticated members to browse daily gym schedules, check real-time available capacity, reserve time slots, view personal booking history, and cancel active reservations.

### Key Aspects:
- Gym slots have a fixed capacity (**10 members per slot**).
- Authenticated users can reserve open spots and cancel their active reservations.
- Cancelling a reservation immediately restores slot capacity.
- The core technical challenge is **preventing overbooking** when multiple concurrent requests attempt to reserve the final remaining spot at the exact same millisecond.

---

## 2. Problem Statement

In high-concurrency reservation systems, traditional "read-then-write" patterns fail under load:
1. When **1 spot remains** (`booked_count = 9`, `capacity = 10`), multiple incoming requests read `booked_count = 9` simultaneously.
2. Every request approves the reservation, pushing `booked_count` to 11 or higher (**overbooking**).

### Solution Requirements:
- Each slot has a strict capacity of **10**.
- Bookings must automatically stop once capacity is reached.
- Cancellation must safely free up slot capacity.
- Simultaneous booking requests must **NEVER** allow capacity to exceed the limit.

This platform enforces concurrency invariants directly at the PostgreSQL engine level using **atomic conditional updates** and **partial unique indexes**.

---

## 3. Scope & Assumptions

| Area | Decision & Implementation |
| :--- | :--- |
| **Slot Model** | Pre-seeded daily time slots with standard 1-hour durations (e.g., 06:00 to 07:00). |
| **Capacity Rule** | Fixed capacity of 10 members per gym slot (`CHECK (booked_count <= capacity)`). |
| **Active Booking Rule** | A user can hold at most one active confirmed reservation per slot (`uq_active_booking_per_user_slot`). |
| **Cancellation** | Active reservations can be cancelled at any time, atomicity restoring slot capacity. |
| **Authentication** | JWT Bearer token authentication required for all protected endpoints. |
| **Slot Creation** | Handled via seed scripts (`node src/seed/seedSlots.js`); no admin slot management UI is required. |
| **Scope Exclusions** | Waitlist queuing, per-slot dynamic capacity editing, and payment gateways are outside project scope. |

---

## 4. Core Features

| Feature | Description |
| :--- | :--- |
| **User Registration** | Account creation with `bcrypt` password hashing (salt rounds = 10). |
| **User Login & Session** | Authenticates credentials and returns JWT Bearer token; session profile retrieval via `/api/auth/me`. |
| **Slot Browsing** | Date-filtered schedule browser displaying live capacity, booked count, and available spot meters. |
| **Atomic Slot Booking** | Concurrency-safe reservation execution protecting against overbooking. |
| **Full-Slot Protection** | Rejects requests with HTTP 409 Conflict (`SLOT_FULL`) when capacity is reached. |
| **Duplicate Booking Prevention** | PostgreSQL partial unique index prevents users from booking the same slot multiple times concurrently. |
| **Booking Cancellation** | Row-locked cancellation execution (`SELECT ... FOR UPDATE`) restoring slot availability. |
| **Capacity Restoration** | Decrements `booked_count` upon cancellation. |
| **My Bookings History** | Displays authenticated user's personal reservation history with active/cancelled status badges. |
| **Redis Capacity Cache** | Cache-Aside pattern (`slot:{slotId}:available`) serving hot availability reads with 10s TTL. |
| **Redis Rate Limiter** | Fixed-window rate limiter protecting write endpoints (10 requests per 60 seconds per user). |
| **MongoDB Activity Logging** | Asynchronous, non-blocking audit logging of lifecycle events (`activity_logs`). |
| **MongoDB Notification History** | Asynchronous logging of notification delivery history (`notification_history`). |
| **Backend Validation** | Input verification using Joi parameter, query, and body schemas. |
| **Centralized Error Handling** | Operational error mapping and internal error sanitization. |

---

## 5. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 | Single Page Application (SPA) user interface |
| **Build Tool** | Vite | Fast dev server and client production bundler |
| **Routing** | React Router v7 | Client-side routing with protected route guards |
| **Backend** | Node.js (v20+) | JavaScript server runtime environment |
| **API Framework** | Express.js 5 | REST API server framework and middleware pipeline |
| **Primary Database** | PostgreSQL 16 | ACID transactional source of truth (`users`, `gym_slots`, `bookings`) |
| **Secondary Database** | MongoDB 7 | Non-transactional audit logs (`activity_logs`) and notification history |
| **Cache & Rate Limiting** | Redis 7 | Hot-read availability caching (`slot:{slotId}:available`) and rate limiting |
| **Authentication** | JWT (`jsonwebtoken`) | Bearer token authentication with 24h expiration |
| **Password Security** | `bcrypt` | Password hashing with salt rounds = 10 |
| **Validation** | `joi` | Strict backend request input validation |
| **Infrastructure** | Docker Compose | Containerized local databases (`gym-postgres`, `gym-mongo`, `gym-redis`) |

> [!IMPORTANT]
> **Docker Infrastructure Scope**: Docker Compose is used **ONLY** for containerizing database and caching services (`gym-postgres`, `gym-mongo`, `gym-redis`). The React frontend and Node.js/Express backend run natively on the host machine. The entire application is **NOT** Dockerized.

---

## 6. System Architecture

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

### Layer Responsibilities:
1. **React SPA**: Single-page user interface built with React 19, Vite, and Glassmorphic CSS.
2. **Express API Server**: REST API routing, controller execution, and error handling.
3. **JWT Auth Middleware**: Validates `Authorization: Bearer <token>` headers and attaches `req.user.id`.
4. **Joi Validation Middleware**: Verifies incoming request payloads before controller processing.
5. **Redis Rate Limiter**: Enforces user-level write request limits.
6. **Controllers**: Manages PostgreSQL database transactions and post-commit side effects.
7. **PostgreSQL**: Authoritative relational database enforcing transactional integrity.
8. **Redis**: In-memory cache for slot availability and rate limit counters.
9. **MongoDB**: Document database storing asynchronous audit trails and notification logs.

---

## 7. Request / Booking Flow

```
1. User authenticates via POST /api/auth/login and receives a Bearer JWT token.
2. Frontend sends request to GET /api/slots?date=YYYY-MM-DD with Authorization header.
3. Auth middleware validates JWT token and populates req.user.id.
4. Slot controller checks Redis cache (slot:{slotId}:available); on hit, returns cached availability.
5. User clicks "Book Slot", sending POST /api/bookings with slotId.
6. Joi middleware validates input payload format.
7. Redis rate limiter checks ratelimit:booking:{userId}; permits if under 10 req/60s.
8. Booking controller starts explicit PostgreSQL transaction (BEGIN).
9. Partial unique index checks for active confirmed bookings by the same user for this slot.
10. Atomic conditional UPDATE executes: SET booked_count = booked_count + 1 WHERE booked_count < capacity.
    ├── If 0 rows updated => ROLLBACK transaction & return HTTP 409 Conflict (SLOT_FULL).
    └── If 1 row updated => INSERT confirmed booking row & COMMIT transaction.
11. Redis capacity cache key is invalidated (DEL slot:{slotId}:available).
12. Asynchronous MongoDB audit log (activity_logs) and notification history records are created post-commit.
```

---

## 8. Database Architecture

### 8.1 PostgreSQL — Primary Source of Truth

PostgreSQL owns all transactional data requiring strict ACID guarantees.

| Table | Purpose | Key Columns & Constraints |
| :--- | :--- | :--- |
| **`users`** | Identity credentials and accounts | `id` (UUID, PK), `email` (UNIQUE), `password_hash`, `role` |
| **`gym_slots`** | Gym time slots and live capacity | `id` (UUID, PK), `slot_date`, `start_time`, `end_time`, `capacity`, `booked_count`, `CHECK (booked_count <= capacity)` |
| **`bookings`** | Slot reservation records | `id` (UUID, PK), `user_id` (FK -> `users`), `slot_id` (FK -> `gym_slots`), `status` (`confirmed`/`cancelled`), `booked_at`, `cancelled_at` |

#### Constraints & Indexes:
- **Capacity Constraint**: `CHECK (booked_count <= capacity)` enforces hard bounds on slot occupation.
- **Active Booking Uniqueness**: `CREATE UNIQUE INDEX uq_active_booking_per_user_slot ON bookings (user_id, slot_id) WHERE status = 'confirmed';` prevents duplicate active reservations.
- **Foreign Keys**: Enforces cascading integrity between `users`, `gym_slots`, and `bookings`.

---

### 8.2 MongoDB — Secondary Non-Transactional Store

MongoDB handles high-volume asynchronous logging and notification history.

| Collection | Purpose | Schema Fields |
| :--- | :--- | :--- |
| **`activity_logs`** | Audit logging of user actions | `userId`, `action` (`booking_created`/`booking_cancelled`), `slotId`, `timestamp`, `metadata` (`ip`, `userAgent`) |
| **`notification_history`** | Notification delivery history | `userId`, `channel` (`email`/`push`), `message`, `sentAt`, `status` (`sent`/`failed`) |

> **Non-Blocking Isolation**: MongoDB operations fire asynchronously post-commit inside try/catch blocks. A MongoDB outage does **NOT** roll back successful PostgreSQL booking transactions.

---

### 8.3 PostgreSQL vs MongoDB Responsibilities

| Requirement | PostgreSQL | MongoDB |
| :--- | :---: | :---: |
| **Booking State & Reservations** | ✅ Primary Authoritative Store | ❌ |
| **ACID Transactional Guarantees** | ✅ Primary Authoritative Store | ❌ |
| **Slot Capacity Correctness** | ✅ Primary Authoritative Store | ❌ |
| **Activity Audit Logging** | ❌ | ✅ Secondary Async Store |
| **Notification Delivery History** | ❌ | ✅ Secondary Async Store |

---

## 9. Concurrency & Overbooking Prevention

### The Problem

Consider a gym slot with **1 spot remaining** (`booked_count = 9`, `capacity = 10`). If 3 users click "Book Slot" simultaneously:
- **Naive Systems**: Read `booked_count = 9` across 3 concurrent threads, approve all 3 reservations, and increment count to `12` (**overbooking**).
- **Gym Slot Booking System**: Evaluates capacity atomically inside PostgreSQL during write execution.

---

### Concurrency Sequence Diagram

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

---

### Core Concurrency Implementation

#### 1. Atomic Conditional Update
Capacity is evaluated directly within the `UPDATE` query inside an explicit PostgreSQL transaction:

```sql
BEGIN;

-- 1. Verify slot exists and check capacity
SELECT id, capacity, booked_count FROM gym_slots WHERE id = $1;

-- 2. Atomically increment booked_count ONLY IF capacity permits
UPDATE gym_slots
SET booked_count = booked_count + 1
WHERE id = $1
  AND booked_count < capacity
RETURNING booked_count;

-- If 0 rows updated => ROLLBACK & return HTTP 409 Conflict (SLOT_FULL)

-- 3. Insert confirmed booking record
INSERT INTO bookings (user_id, slot_id, status)
VALUES ($2, $1, 'confirmed');

COMMIT;
```

#### 2. Duplicate Booking Prevention
A partial unique index at the PostgreSQL level prevents duplicate confirmed reservations by the same user:

```sql
CREATE UNIQUE INDEX uq_active_booking_per_user_slot
ON bookings (user_id, slot_id)
WHERE status = 'confirmed';
```

#### 3. Row-Level Locking on Cancellation
Booking cancellation uses row-level locking (`SELECT ... FOR UPDATE`) to prevent race conditions during concurrent cancellation attempts:

```sql
BEGIN;

-- Lock booking row exclusively
SELECT id, user_id, slot_id, status FROM bookings WHERE id = $1 FOR UPDATE;

-- Update status to cancelled
UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1 AND status = 'confirmed';

-- Decrement booked_count
UPDATE gym_slots SET booked_count = booked_count - 1 WHERE id = $2 AND booked_count > 0;

COMMIT;
```

---

### Verified Concurrency Test Results

| Test Scenario | Load Parameters | Expected Outcome | Verified Result |
| :--- | :--- | :--- | :---: |
| **Peak Slot Burst** | 25 concurrent users against capacity 10 | Exactly 10 successes, 15 rejected as `SLOT_FULL` | ✅ 10 Successes (`201 Created`), 15 Rejected (`409 Conflict`), Final `booked_count` = 10, **0 Overbooking** |
| **Duplicate Booking Burst** | 10 simultaneous requests by same user for same slot | Exactly 1 success, 9 duplicate rejections | ✅ 1 Success (`201 Created`), 9 Rejected (`409 Conflict`), `booked_count` +1 |
| **Cancellation Burst** | 10 simultaneous cancellation requests for same booking | Exactly 1 success, 9 rejections | ✅ 1 Success (`200 OK`), 9 Rejected (`409 Conflict`), `booked_count` -1 |

---

## 10. Redis Strategy & Failure Resilience

### 10.1 Capacity Cache
- **Key Pattern**: `slot:{slotId}:available`
- **TTL**: 10 seconds
- **Strategy**: Cache-Aside pattern (Check Redis -> Miss -> Fetch PostgreSQL -> Write Redis).
- **Write Invalidation**: Key is deleted (`DEL`) post-commit upon successful booking or cancellation.

### 10.2 Booking Rate Limiter
- **Key Pattern**: `ratelimit:booking:{userId}`
- **Window**: Fixed-window 60 seconds
- **Limit**: 10 booking requests per 60 seconds per user
- **Response**: Rejects 11th request with `429 Too Many Requests` and `Retry-After: 60` header.

### 10.3 Failure Resilience & Fail-Open Behavior
- **Redis Outage**: If Redis fails or disconnects, the cache layer bypasses directly to PostgreSQL, and the rate limiter allows traffic through, preventing downtime.
- **MongoDB Outage**: Asynchronous logging errors are caught and logged; PostgreSQL transactions commit successfully.

---

## 11. Authentication & Security

| Security Aspect | Implementation Details | Protection Provided |
| :--- | :--- | :--- |
| **Password Security** | Passwords hashed using `bcrypt` with salt rounds = 10. | Prevents plaintext credential leakage. |
| **JWT Authentication** | Tokens signed with 24-hour expiration using `JWT_SECRET`. | Secure stateless authentication via `Authorization: Bearer <token>`. |
| **Identity Integrity** | User identity derived strictly from JWT subject `sub` (`req.user.id`). | Prevents client parameter spoofing or `userId` manipulation. |
| **Role Escalation Protection** | Client-supplied `role` fields during registration are ignored; defaults to `'member'`. | Prevents unauthorized admin privilege escalation. |
| **SQL Injection Prevention** | All PostgreSQL queries use parameterized placeholders (`$1`, `$2`). | Blocks malicious SQL string injection attempts. |
| **Input Validation** | Incoming request payloads validated against strict Joi schemas. | Prevents invalid parameters and bad data injection. |
| **Secret Management** | Environment variables stored in `.env`; `.env` listed in `.gitignore`. | Prevents committing API keys or secret keys to source control. |
| **Write Rate Limiting** | Write endpoints protected via Redis fixed-window rate limiter. | Prevents automated booking spam and brute-force attacks. |

---

## 12. REST API Reference

### Base URL
`http://localhost:3000/api`

### Endpoints Overview

| Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate credentials and return JWT | No |
| `GET` | `/api/auth/me` | Fetch profile of authenticated user | **Yes** |
| `GET` | `/api/slots?date=YYYY-MM-DD` | List gym slots with live availability (Cached) | **Yes** |
| `POST` | `/api/bookings` | Book a gym slot (Atomic, Rate-limited) | **Yes** |
| `GET` | `/api/bookings` | Retrieve user's booking history | **Yes** |
| `DELETE` | `/api/bookings/:id` | Cancel a booking reservation & restore capacity | **Yes** |

---

### Endpoint Details

#### 1. Register User — `POST /api/auth/register`
- **Request Body**: `{ "name": "John Doe", "email": "john@example.com", "password": "Password123" }`
- **Response (201 Created)**: `{ "message": "Registration successful", "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "member" } }`

#### 2. User Login — `POST /api/auth/login`
- **Request Body**: `{ "email": "john@example.com", "password": "Password123" }`
- **Response (200 OK)**: `{ "token": "eyJhbGciOiJIUzI1Ni...", "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "member" } }`

#### 3. Get Current Profile — `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: `{ "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "member" } }`

#### 4. Get Available Slots — `GET /api/slots?date=YYYY-MM-DD`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: `{ "date": "2026-08-27", "slots": [ { "id": "...", "date": "2026-08-27", "startTime": "06:00:00", "endTime": "07:00:00", "capacity": 10, "bookedCount": 3, "available": 7 } ] }`

#### 5. Book a Gym Slot — `POST /api/bookings`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: `{ "slotId": "3818c0c1-1dd7-4faf-ab13-c5874d43eb8d" }`
- **Response (201 Created)**: `{ "message": "Booking successful", "booking": { "id": "...", "userId": "...", "slotId": "...", "status": "confirmed", "bookedAt": "..." } }`

#### 6. Get My Bookings — `GET /api/bookings`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: `{ "bookings": [ { "id": "...", "slotId": "...", "slotDate": "2026-08-27", "startTime": "06:00:00", "endTime": "07:00:00", "status": "confirmed", "bookedAt": "...", "cancelledAt": null } ] }`

#### 7. Cancel Booking — `DELETE /api/bookings/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: `{ "message": "Booking cancelled successfully" }`

---

## 13. Error Handling & HTTP Status Codes

| Code | Status | Trigger Condition / Description |
| :--- | :--- | :--- |
| **200** | OK | Successful query, profile fetch, or booking cancellation. |
| **201** | Created | Successful user registration or slot booking reservation. |
| **400** | Bad Request | Joi validation failure (e.g. invalid date format, missing fields). |
| **401** | Unauthorized | Missing, expired, or invalid JWT token in `Authorization` header. |
| **403** | Forbidden | User attempting to cancel another user's booking reservation. |
| **404** | Not Found | Target slot/booking ID does not exist, or route not found. |
| **409** | Conflict | Slot capacity full (`SLOT_FULL`), duplicate active booking, or email already in use. |
| **429** | Too Many Requests | Rate limit exceeded (10 booking requests / 60s per user). |
| **500** | Internal Server Error | Unexpected server error. Stack traces and database details are sanitized. |

---

## 14. Frontend Architecture & UX Flow

Built with **React 19**, **Vite**, **React Router v7**, and **Framer Motion**.

### Architecture Components:
- `src/api/client.js`: Centralized fetch wrapper handling base URL and `Authorization` header injection.
- `src/context/AuthContext.jsx`: Context provider managing login, token persistence, and profile restoration.
- `src/components/ProtectedRoute.jsx`: Route guards (`ProtectedRoute` for `/slots` & `/bookings`, `PublicOnlyRoute` for `/login` & `/register`).
- `src/pages/`: Dedicated pages (`LoginPage`, `RegisterPage`, `SlotsPage`, `MyBookingsPage`).

### User Journey:
1. **Register**: User signs up (`/register`), password hashed on backend, redirected to login.
2. **Login**: User authenticates (`/login`), receives Bearer JWT, saved to `localStorage`, redirected to slots.
3. **Browse Slots**: User picks date (`/slots`), views real-time capacity and availability badges.
4. **Book Slot**: User clicks "Book Slot", request processed atomically in PostgreSQL, UI capacity meter updates.
5. **My Bookings**: User views personal reservation history (`/bookings`).
6. **Cancel Booking**: User clicks "Cancel Booking", confirms via glass modal, slot capacity restored.

---

## 15. Project Directory Structure

```
gym-slot-booking/
├── docker-compose.yml          # Infrastructure configuration (PostgreSQL, MongoDB, Redis)
├── README.md                   # Project documentation
├── .gitignore
│
├── backend/                    # Node.js + Express API Backend
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js              # Express app setup & middleware
│       ├── server.js           # Server listener & database initialization
│       ├── config/
│       │   ├── mongo.js        # Mongoose connection client
│       │   ├── postgres.js     # PostgreSQL pg pool client
│       │   └── redis.js        # ioredis client
│       ├── controllers/
│       │   ├── authController.js    # Register, login, me
│       │   ├── bookingController.js # Booking creation, cancellation, history
│       │   └── slotController.js    # Slot schedule listing
│       ├── db/
│       │   └── migrations/     # PostgreSQL SQL migrations (001 - 004)
│       ├── middleware/
│       │   ├── authMiddleware.js      # JWT Bearer token verification
│       │   ├── bookingRateLimiter.js  # Redis fixed-window rate limiter
│       │   ├── errorHandler.js        # Centralized Express error handler
│       │   ├── notFound.js            # 404 route handler
│       │   └── validate.js            # Joi schema validation middleware
│       ├── models/
│       │   └── mongo/
│       │       ├── activityLog.js     # Mongoose ActivityLog schema
│       │       └── notification.js    # Mongoose Notification schema
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── bookingRoutes.js
│       │   └── slotRoutes.js
│       ├── seed/
│       │   └── seedSlots.js           # Seed script for gym slots
│       └── utils/
│           ├── AppError.js            # Custom operational error class
│           ├── jwt.js                 # JWT sign & verify helpers
│           ├── notificationService.js # Simulated non-blocking notification delivery
│           └── validationSchemas.js   # Joi schemas
│
└── frontend/                   # React 19 + Vite Frontend
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.css
        ├── App.jsx             # React Router layout & routes
        ├── index.css           # Glassmorphism design system
        ├── main.jsx            # Entry point
        ├── api/
        │   └── client.js       # API fetch wrapper with JWT header injection
        ├── components/
        │   ├── Navbar.jsx      # Navigation bar
        │   └── ProtectedRoute.jsx # Auth route guards
        ├── context/
        │   └── AuthContext.jsx # Auth state provider
        └── pages/
            ├── LoginPage.jsx        # Login page
            ├── RegisterPage.jsx     # Registration page
            ├── SlotsPage.jsx        # Slot schedule browser
            └── MyBookingsPage.jsx   # Booking history & cancellation modal
```

---

## 16. Local Setup & Execution Guide

### Prerequisites
- [Docker Desktop](https://www.docker.com/) (running locally)
- [Node.js](https://nodejs.org/) (v20+)
- [npm](https://www.npmjs.com/) (v10+)

---

### Step 1: Start Infrastructure Containers
Launch PostgreSQL, MongoDB, and Redis in detached mode:
```bash
docker compose up -d
```

### Step 2: Verify Container Status
```bash
docker compose ps
```
*Expected output: `gym-postgres` (healthy), `gym-mongo` (Up), `gym-redis` (Up).*

---

### Step 3: Configure and Start Backend

1. Navigate to `backend`:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create local `.env` file:
   ```env
   DATABASE_URL=postgres://gymuser:gympassword@localhost:5432/gymbooking
   MONGO_URL=mongodb://localhost:27017/gymbooking
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=gymbooking_jwt_secret_key_2026_super_secure
   PORT=3000
   ```

4. Seed gym slots (for date `2026-08-27`):
   ```bash
   node src/seed/seedSlots.js
   ```

5. Start backend server:
   ```bash
   npm start
   ```
   *Backend running on `http://localhost:3000`.*

---

### Step 4: Configure and Start Frontend

1. Open a new terminal window and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create local `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

4. Start Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend running on `http://localhost:5173`.*

---

## 17. Environment Variables Reference

| Variable | Description | Location | Default / Example Value |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URL | `backend/.env` | `postgres://gymuser:gympassword@localhost:5432/gymbooking` |
| `MONGO_URL` | MongoDB connection URL | `backend/.env` | `mongodb://localhost:27017/gymbooking` |
| `REDIS_URL` | Redis connection URL | `backend/.env` | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for signing Bearer tokens | `backend/.env` | `gymbooking_jwt_secret_key_2026_super_secure` |
| `PORT` | Express API server port | `backend/.env` | `3000` |
| `VITE_API_BASE_URL` | Frontend API base URL | `frontend/.env` | `http://localhost:3000` |

---

## 18. Testing & Verification Summary

| Suite / Scenario | Test Execution & Behavior Verified | Status |
| :--- | :--- | :---: |
| **Authentication** | Bcrypt hashing, JWT issuance, profile retrieval, duplicate email conflict handling. | ✅ Verified |
| **Slot Management** | Date filtering (`?date=YYYY-MM-DD`), capacity meter calculations, Redis Cache-Aside hits/misses. | ✅ Verified |
| **Booking Concurrency** | 25 simultaneous booking requests against capacity 10 -> exactly 10 succeeded, 15 rejected (`409 SLOT_FULL`), 0 overbooking. | ✅ Verified |
| **Duplicate Booking Protection** | 10 simultaneous duplicate booking requests for same user -> 1 success, 9 duplicate rejections. | ✅ Verified |
| **Cancellation & Row Lock** | 10 simultaneous cancellation requests on booking -> 1 success, 9 rejections, slot capacity restored. | ✅ Verified |
| **Rate Limiting** | 11 rapid booking requests from single user -> 11th request rejected (`429 Too Many Requests`). | ✅ Verified |
| **Failure Resilience** | Redis/MongoDB disconnected during active traffic -> PostgreSQL bookings executed without downtime. | ✅ Verified |

---

## 19. Scalability & Future Architecture

### Current Scalability Strengths
- **Single Query Execution**: `GET /api/slots` uses a single SQL query; `GET /api/bookings` uses an indexed `JOIN`.
- **Redis Cache-Aside**: Read operations bypass PostgreSQL when Redis cache hits occur.
- **Asynchronous Fire-and-Forget Logging**: MongoDB audit logging executes post-commit without delaying HTTP responses.

### Future Scaling Options (100x Traffic)
1. **Stateless API Clustering**: Deploy multiple Node.js/Express API instances behind an Application Load Balancer (ALB / NGINX).
2. **PostgreSQL Read Replicas & Connection Pooling**: Deploy **PgBouncer** to pool database connections and direct read-only queries to PostgreSQL read replicas.
3. **Distributed Redis Cluster**: Shard Redis availability cache and rate-limit counters across a multi-node Redis Cluster.
4. **Asynchronous Message Queue**: Offload post-commit MongoDB audit logging and notification distribution to a dedicated queue worker (BullMQ / RabbitMQ).

---

## 20. Video Walkthrough & Presentation Flow

For a 5–10 minute demonstration, use the following sequence:

1. **System Architecture Overview (1 min)**: Highlight multi-database separation (PostgreSQL, MongoDB, Redis) and Docker setup.
2. **Infrastructure Launch (1 min)**: Run `docker compose up -d` and `docker compose ps` in terminal.
3. **User Registration & Login (1.5 min)**: Demonstrate account creation (`/register`), password hashing, login (`/login`), and JWT issuance.
4. **Slot Schedule & Availability (1.5 min)**: Select date (`/slots`), view slots, explain Redis Cache-Aside strategy.
5. **Booking Execution & Capacity Increment (1.5 min)**: Reserve slot, demonstrate capacity decrement in UI and PostgreSQL table.
6. **Booking History & Cancellation (1.5 min)**: Navigate to `/bookings`, execute cancellation, demonstrate capacity restoration.
7. **Concurrency Explanation & Stress Test Results (2 min)**: Explain PostgreSQL atomic conditional updates, show partial unique index, and review 25-user stress test results (0 overbooking).

---

## 21. License

This project is open-source and available under the [ISC License](LICENSE).
