# 🏋️ Gym Slot Booking System

A full-stack gym slot reservation system built with **React**, **Node.js / Express**, **PostgreSQL**, **MongoDB**, and **Redis**.

This project demonstrates a multi-database architecture where **PostgreSQL** acts as the transactional source of truth for concurrency and capacity correctness, **MongoDB** serves as the secondary non-transactional store for audit logs and notification history, and **Redis** handles hot-read caching and booking rate limiting.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Assignment Compliance](#-assignment-compliance)
- [System Architecture](#-system-architecture)
- [Concurrency & Data Consistency](#-concurrency--data-consistency)
- [Database Roles & Schemas](#-database-roles--schemas)
- [API Documentation](#-api-documentation)
- [Frontend Application](#-frontend-application)
- [Setup & Local Execution Guide](#-setup--local-execution-guide)
- [Verification & Testing](#-verification--testing)
- [Project Directory Structure](#-project-directory-structure)

---

## 🌟 Overview

The **Gym Slot Booking System** allows authenticated gym members to view daily slot schedules, check real-time available capacity, reserve slots, view personal booking history, and cancel active reservations.

### Core Business Problem & Challenge
Gym slots have a strict, limited capacity (10 members per slot). When multiple users attempt to book the final remaining slot simultaneously, traditional read-then-write logic leads to **race conditions** and **overbooking**.

This system solves the overbooking problem at the database engine level using **PostgreSQL atomic conditional updates** and **partial unique indexes**, ensuring that even under high concurrent load:
- **Zero overbooking** can ever occur (`booked_count <= capacity` is strictly enforced).
- **Duplicate active bookings** for the same user and slot are rejected with `409 Conflict`.
- **Non-blocking side effects** (Redis cache invalidation, MongoDB activity logging, and notification history) never compromise core transaction state.

---

## ✅ Assignment Compliance

This project fulfills all mandatory technology stack requirements:

| Requirement | Implementation | Responsibility |
| :--- | :--- | :--- |
| **React.js** | React 19 + Vite + React Router v7 | Single Page Application (SPA) frontend UI |
| **Node.js** | Node.js (v20+) runtime | Backend server environment |
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

## 🏗️ System Architecture

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

## 🔒 Concurrency & Data Consistency

### 1. Atomic Capacity Decrement (Overbooking Protection)
To prevent overbooking when 25+ users book a slot with a capacity of 10 concurrently, capacity is updated directly within PostgreSQL using an atomic conditional update:

```sql
UPDATE gym_slots
SET booked_count = booked_count + 1
WHERE id = $1
  AND booked_count < capacity
RETURNING booked_count;
```

If `booked_count` has reached `capacity`, `UPDATE` returns 0 affected rows. The transaction immediately executes `ROLLBACK` and responds with `409 Conflict` (`SLOT_FULL`).

### 2. Partial Unique Index (Duplicate Active Booking Prevention)
To ensure a user cannot hold multiple active bookings for the same slot while allowing re-booking if a previous booking was cancelled, a partial unique index is enforced in PostgreSQL:

```sql
CREATE UNIQUE INDEX uq_active_booking_per_user_slot
ON bookings (user_id, slot_id)
WHERE status = 'confirmed';
```

If a user submits a concurrent duplicate request, PostgreSQL rejects the second `INSERT` with code `23505`, triggering an automatic transaction rollback.

### 3. Row Locking on Cancellation
Booking cancellation uses row-level locking (`FOR UPDATE`) to prevent race conditions during concurrent cancellation attempts:

```sql
BEGIN;
SELECT id, user_id, slot_id, status FROM bookings WHERE id = $1 FOR UPDATE;
UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1 AND status = 'confirmed';
UPDATE gym_slots SET booked_count = booked_count - 1 WHERE id = $2 AND booked_count > 0;
COMMIT;
```

### Verification Test Results
Under stress testing with **25 simultaneous user booking requests** against a slot with capacity **10**:
- **10 requests** succeeded (`201 Created`).
- **15 requests** were rejected (`409 Conflict`, `SLOT_FULL`).
- Final PostgreSQL `booked_count` = **10 / 10**.
- Overbooking instances = **0**.

---

## 🗄️ Database Roles & Schemas

### 1. PostgreSQL (Transactional Source of Truth)

- **`users` Table**:
  - `id` (UUID, Primary Key)
  - `name` (VARCHAR)
  - `email` (VARCHAR, Unique)
  - `password_hash` (VARCHAR)
  - `role` (VARCHAR, default `'member'`)
  - `created_at` (TIMESTAMPTZ)

- **`gym_slots` Table**:
  - `id` (UUID, Primary Key)
  - `slot_date` (DATE)
  - `start_time` (TIME)
  - `end_time` (TIME)
  - `capacity` (INTEGER, default 10)
  - `booked_count` (INTEGER, default 0, `CHECK (booked_count <= capacity)`)
  - `created_at` (TIMESTAMPTZ)

- **`bookings` Table**:
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key -> `users.id`)
  - `slot_id` (UUID, Foreign Key -> `gym_slots.id`)
  - `status` (VARCHAR, `'confirmed'` | `'cancelled'`)
  - `booked_at` (TIMESTAMPTZ)
  - `cancelled_at` (TIMESTAMPTZ, Nullable)

### 2. MongoDB (Non-Transactional Audit & History)

- **`activity_logs` Collection** (`backend/src/models/mongo/activityLog.js`):
  - `userId` (String)
  - `action` (String: `'booking_created'` | `'booking_cancelled'`)
  - `slotId` (String)
  - `timestamp` (Date)
  - `metadata` (`{ ip, userAgent }`)

- **`notification_history` Collection** (`backend/src/models/mongo/notification.js`):
  - `userId` (String)
  - `channel` (String: `'email'` | `'push'`)
  - `message` (String)
  - `sentAt` (Date)
  - `status` (String: `'sent'` | `'failed'`)

### 3. Redis (Caching & Rate Limiting)

- **Slot Availability Cache**:
  - Key Pattern: `slot:{slotId}:available`
  - Value: Remaining integer capacity
  - Strategy: Cache-Aside with 10s TTL, invalidated (`DEL`) immediately post-commit on bookings/cancellations.
  - Fail-Open: If Redis is offline, system queries PostgreSQL directly.

- **Booking Rate Limiter**:
  - Key Pattern: `ratelimit:booking:{userId}`
  - Window: Fixed-window 60 seconds
  - Limit: 10 booking requests per 60 seconds per user
  - Response: `429 Too Many Requests` with `Retry-After: 60` header.

---

## 📡 API Documentation

### Base URL
`http://localhost:3000/api`

---

### Authentication Endpoints

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
- **Error Responses**: `400 Bad Request` (Validation error), `409 Conflict` (`Email already in use`).

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
- **Error Responses**: `400 Bad Request`, `401 Unauthorized` (`Invalid email or password`).

#### 3. Get Current User Profile
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

---

### Slot Endpoints

#### 4. Get Available Gym Slots
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
- **Error Responses**: `400 Bad Request` (Invalid date format), `401 Unauthorized`.

---

### Booking Endpoints

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
- **Error Responses**:
  - `400 Bad Request`: Invalid slotId format.
  - `401 Unauthorized`: Missing or invalid JWT.
  - `404 Not Found`: Slot does not exist.
  - `409 Conflict`: `You already have a booking for this slot`.
  - `409 Conflict`: `{"message": "Slot is full", "code": "SLOT_FULL"}`.
  - `429 Too Many Requests`: Rate limit exceeded.

#### 6. Get My Bookings History
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
- **Error Responses**:
  - `400 Bad Request`: Invalid UUID parameter.
  - `403 Forbidden`: `You are not authorized to cancel this booking`.
  - `404 Not Found`: Booking ID does not exist.
  - `409 Conflict`: `Booking is already cancelled`.

---

## 💻 Frontend Application

The frontend is built as a single-page application using **React 19**, **Vite**, and **React Router v7**.

### Key Features & Design
- **Route Protection**: `ProtectedRoute` guards `/slots` and `/bookings`. `PublicOnlyRoute` redirects logged-in users away from `/login` and `/register`.
- **Session Restoration**: Automatically validates stored JWT on app startup via `GET /api/auth/me`.
- **Real-Time Capacity Feedback**: Displays real-time `Capacity`, `Booked Count`, and `Available Count` badges for each slot.
- **Action Safeguards**: "Book Slot" buttons automatically disable when slots are full (`available === 0`) or when the user already holds an active booking for that slot.
- **Cancellation Flow**: Confirmed bookings provide an interactive confirmation modal before executing cancellation.

---

## ⚙️ Setup & Local Execution Guide

### Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Docker Desktop**: Docker engine running locally

---

### Step 1: Start Docker Infrastructure Services

Start PostgreSQL, MongoDB, and Redis containers in detached mode:

```bash
docker compose up -d
```

Verify all 3 containers are healthy and running:

```bash
docker compose ps
```

*Expected Output:*
```
NAME           IMAGE                STATUS
gym-mongo      mongo:7              Up
gym-postgres   postgres:16-alpine   Up (healthy)
gym-redis      redis:7-alpine       Up
```

---

### Step 2: Configure and Start Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Create local environment file `.env`:
   ```env
   DATABASE_URL=postgres://gymuser:gympassword@localhost:5432/gymbooking
   MONGO_URL=mongodb://localhost:27017/gymbooking
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=gymbooking_jwt_secret_key_2026_super_secure
   PORT=3000
   ```

4. Seed the initial gym slots for testing:
   ```bash
   node src/seed/seedSlots.js
   ```

5. Start the Express backend server:
   ```bash
   npm start
   ```
   *Output:* `Server running on port 3000`

---

### Step 3: Configure and Start Frontend

1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create local environment file `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```

5. Open your browser at `http://localhost:5173`.

---

## 🧪 Verification & Testing

The system has been verified through automated integration tests and manual browser testing across 15 execution steps:

- **Auth & Security**: Verified bcrypt hashing, 401 unauthorized errors, duplicate email conflicts (409), role elevation blocking, and JWT user isolation.
- **Concurrency & Overbooking**: Verified 25 simultaneous booking attempts against capacity 10 resulted in exactly 10 successes and 15 rejections with 0 overbooking.
- **Cancellation & Row Locking**: Verified concurrent cancellations decrement `booked_count` exactly once and enforce ownership (403).
- **Cache & Resiliency**: Verified Redis cache invalidation on booking/cancellation, Redis rate limiting (10 req/min), and non-blocking fallback when Redis/MongoDB are temporarily offline.
- **Database Consistency Audit**: Verified `booked_count == COUNT(bookings WHERE status = 'confirmed')` 100% across all database slots.

---

## 📁 Project Directory Structure

```
gym-slot-booking/
├── docker-compose.yml          # Infrastructure configuration (PostgreSQL, MongoDB, Redis)
├── README.md                   # Project documentation & reference
├── .gitignore
│
├── backend/                    # Node.js + Express Backend
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js              # Express app setup & middleware mounting
│       ├── server.js           # Server listener & database initialization
│       ├── config/
│       │   ├── mongo.js        # Mongoose connection
│       │   ├── postgres.js     # PostgreSQL pg pool client
│       │   └── redis.js        # ioredis client
│       ├── controllers/
│       │   ├── authController.js    # Register, login, getMe
│       │   ├── bookingController.js # Create booking, cancel booking, get my bookings
│       │   └── slotController.js    # Get slots (Cache-Aside)
│       ├── db/
│       │   └── migrations/     # PostgreSQL SQL schema migrations (001 - 004)
│       ├── middleware/
│       │   ├── authMiddleware.js      # JWT Bearer verification
│       │   ├── bookingRateLimiter.js  # Redis fixed-window rate limiter
│       │   ├── errorHandler.js        # Centralized Express error handler
│       │   ├── notFound.js            # 404 unknown route handler
│       │   └── validate.js            # Joi validation middleware
│       ├── models/
│       │   └── mongo/
│       │       ├── activityLog.js     # Mongoose ActivityLog schema
│       │       └── notification.js    # Mongoose Notification schema
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── bookingRoutes.js
│       │   └── slotRoutes.js
│       ├── seed/
│       │   └── seedSlots.js           # Seed script for 5 gym slots
│       └── utils/
│           ├── AppError.js            # Custom operational error class
│           ├── jwt.js                 # JWT sign and verify helpers
│           ├── notificationService.js # Simulated non-blocking notification side-effects
│           └── validationSchemas.js   # Joi schemas for endpoints
│
└── frontend/                   # React + Vite Frontend
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.css
        ├── App.jsx             # Router layout & route definitions
        ├── index.css           # Global CSS design system
        ├── main.jsx            # React root mount
        ├── api/
        │   └── client.js       # Centralized API fetch wrapper with JWT attachment
        ├── components/
        │   ├── Navbar.jsx      # Header navigation bar & user state
        │   └── ProtectedRoute.jsx # Route protection guards
        ├── context/
        │   └── AuthContext.jsx # Authentication state provider
        └── pages/
            ├── LoginPage.jsx        # Login page
            ├── RegisterPage.jsx     # Registration page
            ├── SlotsPage.jsx        # Slots booking page
            └── MyBookingsPage.jsx   # Booking history & cancellation page
```
