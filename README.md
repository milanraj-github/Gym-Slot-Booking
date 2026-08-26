# Gym Slot Booking System

A production-ready full-stack gym reservation platform designed to eliminate overbooking under heavy concurrent traffic. Built with **React**, **Node.js/Express**, **PostgreSQL**, **MongoDB**, **Redis**, and containerized infrastructure via **Docker Compose**.

---

## 1. Overview

The **Gym Slot Booking System** allows authenticated gym members to view daily slot schedules, check real-time available capacity, reserve slots, view personal booking history, and cancel active reservations.

### Key Aspects:
- Gym slots have a fixed, limited capacity (**10 members per slot**).
- Authenticated users can view daily schedules, reserve open spots, and cancel active reservations.
- Booking cancellation immediately restores slot capacity.
- The primary technical challenge is preventing **overbooking** when multiple concurrent booking requests hit the exact same remaining slot simultaneously.

---

## 2. Problem Statement

In high-concurrency reservation platforms, classic "read-then-write" patterns fail under load:
1. When **1 spot remains** (`booked_count = 9`, `capacity = 10`), multiple incoming requests read `booked_count = 9` at the same time.
2. Every request approves the reservation, pushing `booked_count` to 11 or higher (**overbooking**).

### Requirements:
- Each slot has a strict capacity of **10**.
- Bookings must automatically stop once capacity is reached.
- Cancellation must safely free up slot capacity.
- Simultaneous booking requests must **NEVER** allow capacity to exceed the limit.

This project solves the problem by enforcing concurrency constraints at the PostgreSQL engine level using **atomic conditional updates** and **partial unique indexes**.

---

## 3. Core Features

- **User Registration**: Register new member accounts (`POST /api/auth/register`) with bcrypt password hashing.
- **JWT Authentication**: User login (`POST /api/auth/login`) returning Bearer JWT tokens and session profile retrieval (`GET /api/auth/me`).
- **View Gym Slots**: Browse slots by date (`GET /api/slots?date=YYYY-MM-DD`) with real-time capacity and remaining spot meters.
- **Atomic Slot Booking**: Reserve available slots (`POST /api/bookings`) with database-level capacity protection.
- **Full-Slot Protection**: Automatically rejects requests with HTTP 409 Conflict (`SLOT_FULL`) when a slot reaches capacity.
- **Duplicate Booking Prevention**: PostgreSQL partial unique index prevents users from booking the same slot multiple times concurrently.
- **Booking Cancellation**: Cancel confirmed reservations (`DELETE /api/bookings/:id`) using row-level locking.
- **Capacity Restoration**: Cancellations safely restore available slot spots in PostgreSQL.
- **My Bookings History**: View personal reservation history (`GET /api/bookings`) filtered strictly by the authenticated user.
- **Redis Available-Capacity Cache**: Hot slot availability reads served directly from Redis with instant invalidation on write transactions.
- **Redis Booking Rate Limiter**: Fixed-window rate limiter protecting write endpoints (10 requests per 60 seconds per user).
- **MongoDB Activity Logging**: Asynchronous, non-blocking audit trail logging (`activity_logs`).
- **MongoDB Notification History**: Asynchronous logging of notification events (`notification_history`).
- **Backend Validation**: Parameter, query, and body validation using Joi schemas.
- **Centralized Error Handling**: Standardized operational error formatting and internal error sanitization.

---

## 4. Technology Stack

### Frontend
- **React 19**: Component-based user interface with Glassmorphic design system.
- **Vite**: Fast frontend build tool and dev server.
- **React Router v7**: Client-side routing with protected route guards.

### Backend
- **Node.js**: JavaScript runtime environment.
- **Express.js**: REST API server framework.

### Databases / Infrastructure
- **PostgreSQL 16**: Primary transactional database and authoritative source of truth.
- **MongoDB 7**: Secondary non-transactional database for audit logs and notification history.
- **Redis 7**: Hot-read availability cache and rate-limiting store.

### Security / Utilities
- **JSON Web Tokens (jsonwebtoken)**: Bearer token authentication.
- **bcrypt**: Password hashing with salt rounds = 10.
- **Joi**: Backend request input validation.

### Docker Clarification

> [!IMPORTANT]
> Docker Compose is used **ONLY** for containerizing the database and caching infrastructure services (`gym-postgres`, `gym-mongo`, `gym-redis`). The React frontend and Node.js/Express backend run directly on the host machine. The entire application is **NOT** Dockerized.

---

## 5. System Architecture

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

## 6. Application Flow

The full request execution flow proceeds as follows:

1. **Client Request**: The React SPA submits an HTTP request to the Express API.
2. **JWT Authentication**: `authMiddleware` verifies the Bearer token in the `Authorization` header and populates `req.user.id`.
3. **Joi Validation**: Payload data is validated against Joi schemas; invalid requests return HTTP 400 Bad Request.
4. **Redis Rate Limiting**: The rate limiter checks `ratelimit:booking:{userId}`; requests exceeding 10 req/60s return HTTP 429.
5. **PostgreSQL Transaction**: The booking controller initiates a database transaction (`BEGIN`), checks duplicate booking indexes, and executes an atomic `UPDATE` condition (`booked_count < capacity`).
6. **Commit or Rollback**: If capacity is available, the slot count is incremented, the booking is inserted, and the transaction commits (`COMMIT`). If full, it rolls back (`ROLLBACK`) and returns HTTP 409 Conflict.
7. **Cache Invalidation**: On successful commit, the corresponding Redis key (`slot:{slotId}:available`) is deleted (`DEL`).
8. **MongoDB Side Effects**: Audit events (`activity_logs`) and notification records (`notification_history`) are logged asynchronously post-commit.

> **PostgreSQL is the authoritative transactional source of truth.** Redis and MongoDB serve strictly as non-blocking caching and logging layers.

---

## 7. Database Architecture

### PostgreSQL (Primary Source of Truth)
PostgreSQL handles all core relational data requiring strict ACID transactional guarantees.

- **`users`**: User identities, emails, role assignments, and password hashes.
- **`gym_slots`**: Training slots, schedules, capacity limits, and live `booked_count`.
- **`bookings`**: Reservation records linked via foreign keys to `users` and `gym_slots`.

### MongoDB (Secondary Non-Transactional Store)
MongoDB stores high-volume audit logs and notification attempts. Operations are executed asynchronously post-commit in try/catch blocks to ensure database isolation.

- **`activity_logs`**: Logs user lifecycle events (`booking_created`, `booking_cancelled`) with IP address and user-agent metadata.
- **`notification_history`**: Captures notification attempt status (`sent`, `failed`) and delivery channel (`email`, `push`).

### Redis (Cache & Rate Limiter)
Redis provides low-latency caching and rate limiting:

- **`slot:{slotId}:available`**: Caches available slot capacity with a 10-second TTL.
- **`ratelimit:booking:{userId}`**: Fixed-window rate limiter counter tracking booking attempts per user per 60-second window.

---

## 8. Booking & Concurrency Design

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

### Core Concurrency Mechanisms

#### 1. Atomic Conditional Update
Instead of checking capacity in application code, capacity is evaluated atomically inside PostgreSQL:

```sql
BEGIN;

-- Verify slot exists and check capacity
SELECT id, capacity, booked_count FROM gym_slots WHERE id = $1;

-- Atomically increment booked_count ONLY IF capacity permits
UPDATE gym_slots
SET booked_count = booked_count + 1
WHERE id = $1
  AND booked_count < capacity
RETURNING booked_count;

-- If 0 rows updated => ROLLBACK & return HTTP 409 Conflict (SLOT_FULL)

-- Insert confirmed booking record
INSERT INTO bookings (user_id, slot_id, status)
VALUES ($2, $1, 'confirmed');

COMMIT;
```

#### 2. Partial Unique Index (Duplicate Active Booking Prevention)
To prevent a user from holding multiple active reservations for the same slot:

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

### Verified Concurrency Test Results

#### 25 Concurrent Users -> Capacity 10:
- **10 requests** succeeded (`201 Created`).
- **15 requests** were rejected as `SLOT_FULL` (`409 Conflict`).
- Final PostgreSQL `booked_count` = **10 / 10**.
- Overbooking count = **0**.

#### Concurrent Duplicate Booking Protection:
- 10 simultaneous booking attempts for the same user resulted in exactly **1 success** and **9 duplicate rejections** (`409 Conflict`).

#### Concurrent Cancellation Protection:
- 10 simultaneous cancellation attempts for the same booking resulted in exactly **1 success** and **9 rejections**.

---

## 9. API Reference

### Base URL
`http://localhost:3000/api`

---

### Endpoints Overview

| Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate credentials and receive Bearer JWT | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | **Yes** |
| `GET` | `/api/slots?date=YYYY-MM-DD` | List gym slots with live availability (Cached) | **Yes** |
| `POST` | `/api/bookings` | Book a gym slot (Atomic, Rate-limited) | **Yes** |
| `GET` | `/api/bookings` | Retrieve authenticated user's booking history | **Yes** |
| `DELETE` | `/api/bookings/:id` | Cancel a booking reservation & restore capacity | **Yes** |

---

### Endpoint Details

#### 1. Register User
`POST /api/auth/register`

- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Registration successful",
    "user": {
      "id": "d994d73f-0f6b-4699-9c09-bcf04d507203",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member"
    }
  }
  ```

#### 2. User Login
`POST /api/auth/login`

- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "Password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "d994d73f-0f6b-4699-9c09-bcf04d507203",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member"
    }
  }
  ```

#### 3. Get Current Profile
`GET /api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "d994d73f-0f6b-4699-9c09-bcf04d507203",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member"
    }
  }
  ```

#### 4. Get Available Slots
`GET /api/slots?date=YYYY-MM-DD`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "date": "2026-08-27",
    "slots": [
      {
        "id": "3818c0c1-1dd7-4faf-ab13-c5874d43eb8d",
        "date": "2026-08-27",
        "startTime": "06:00:00",
        "endTime": "07:00:00",
        "capacity": 10,
        "bookedCount": 3,
        "available": 7
      }
    ]
  }
  ```

#### 5. Book a Gym Slot
`POST /api/bookings`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "slotId": "3818c0c1-1dd7-4faf-ab13-c5874d43eb8d"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Booking successful",
    "booking": {
      "id": "96b20280-4d13-4730-8686-fa5ffc0f70fd",
      "userId": "d994d73f-0f6b-4699-9c09-bcf04d507203",
      "slotId": "3818c0c1-1dd7-4faf-ab13-c5874d43eb8d",
      "status": "confirmed",
      "bookedAt": "2026-08-26T12:00:00.000Z"
    }
  }
  ```

#### 6. Get My Bookings
`GET /api/bookings`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "bookings": [
      {
        "id": "96b20280-4d13-4730-8686-fa5ffc0f70fd",
        "slotId": "3818c0c1-1dd7-4faf-ab13-c5874d43eb8d",
        "slotDate": "2026-08-27",
        "startTime": "06:00:00",
        "endTime": "07:00:00",
        "status": "confirmed",
        "bookedAt": "2026-08-26T12:00:00.000Z",
        "cancelledAt": null
      }
    ]
  }
  ```

#### 7. Cancel Booking
`DELETE /api/bookings/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "message": "Booking cancelled successfully"
  }
  ```

---

## 10. Redis Strategy

### 1. Capacity Cache
- **Pattern**: Cache-Aside pattern (`slot:{slotId}:available`).
- **TTL**: 10 seconds.
- **Write Invalidation**: Key is deleted (`DEL`) post-commit upon successful booking or cancellation.
- **Authoritative Source**: PostgreSQL remains authoritative.

### 2. Rate Limiting
- **Pattern**: Fixed-window rate limiter (`ratelimit:booking:{userId}`).
- **Window & Limit**: 10 booking requests per 60 seconds per user.
- **Response**: Rejects 11th request with `429 Too Many Requests` and `Retry-After: 60` header.
- **Identity**: Derived securely from JWT `sub` (`req.user.id`).

### 3. Failure Handling
- **Fail-Open Behavior**: If Redis experiences an outage, the cache layer bypasses directly to PostgreSQL, and the rate limiter allows traffic through, preventing system downtime.

---

## 11. Authentication & Security

- **JWT Bearer Authentication**: Tokens signed with 24-hour expiration using `JWT_SECRET`.
- **Bcrypt Password Security**: Passwords hashed with salt rounds = 10. Plaintext credentials are never stored or returned.
- **Identity Security**: User identity is derived exclusively from the JWT payload (`req.user.id`). Client attempts to inject `userId` in parameters or request body are ignored.
- **Role Escalation Protection**: Role selection during registration is ignored; all new users default to `'member'`.
- **Parameterized SQL**: All PostgreSQL queries use parameterized placeholders (`$1`, `$2`) to eliminate SQL injection risks.
- **Joi Payload Validation**: Incoming requests are validated against strict schemas before controller execution.
- **Secret Protection**: Secrets are stored in `.env` files; `.env` is listed in `.gitignore`. `.env.example` templates are provided.

---

## 12. Error Handling & Resilience

### Error Responses
The backend uses a centralized error handler (`errorHandler.js`) and custom operational error class (`AppError`). Database constraints map automatically to HTTP responses:
- **Joi Validation Error**: `400 Bad Request` with field-level details.
- **Missing / Invalid JWT**: `401 Unauthorized`.
- **Unauthorized Ownership Action**: `403 Forbidden`.
- **Route / Slot Not Found**: `404 Not Found`.
- **Full Slot / Duplicate Booking / Email Exists**: `409 Conflict`.
- **Rate Limit Exceeded**: `429 Too Many Requests`.
- **Server Errors**: `500 Internal Server Error`.

### Error Sanitization
Internal stack traces, raw SQL queries, database strings, and secrets are sanitized and hidden from client HTTP responses.

### Failure Behavior
- **Redis Failure**: Bypasses cache directly to PostgreSQL.
- **MongoDB Failure**: Asynchronous logging errors are caught and logged; PostgreSQL transactions commit successfully.

---

## 13. Project Structure

```
gym-slot-booking/
├── docker-compose.yml          # Infrastructure containers (PostgreSQL, MongoDB, Redis)
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
│       │   ├── mongo.js        # Mongoose database client
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

## 14. Local Setup & Running

### Prerequisites
- [Docker Desktop](https://www.docker.com/) (running locally)
- [Node.js](https://nodejs.org/) (v20+)
- [npm](https://www.npmjs.com/) (v10+)

---

### Step 1: Start Infrastructure Containers

Start PostgreSQL, MongoDB, and Redis in detached mode:
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

5. Start the backend API server:
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

## 15. License

This project is open-source and available under the [ISC License](LICENSE).
