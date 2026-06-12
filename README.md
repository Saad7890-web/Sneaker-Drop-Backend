# Sneaker Drop Backend

Production-oriented backend for a limited-quantity sneaker drop system.

It supports:

- user registration and login
- admin-only drop creation
- listing active drops and viewing drop details
- reserving an item for 60 seconds
- completing a purchase from a live reservation
- automatic expiration cleanup and stock restoration
- real-time stock / reservation / purchase updates over Socket.IO

## Tech Stack

- Node.js + TypeScript
- Express 5
- Prisma ORM
- PostgreSQL
- Socket.IO
- Zod for validation
- JWT authentication
- bcryptjs for password hashing

## Project Structure

- `src/server.ts` starts HTTP + Socket.IO and launches the reservation expiration worker
- `src/app.ts` configures Express, middleware, and routes
- `src/services/` contains business logic
- `src/repositories/` contains raw DB locking/query helpers
- `src/jobs/reservation-expiration.worker.ts` runs the cleanup sweep
- `prisma/schema.prisma` defines the database schema
- `prisma/migrations/*/migration.sql` contains the actual SQL applied to PostgreSQL

---

## Requirements

- Node.js 20+ recommended
- PostgreSQL 14+ recommended
- npm

---

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Create your environment file

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/sneaker_drop
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
CORS_ORIGIN=http://localhost:3000
```

Optional admin bootstrap variables for the admin creation script:

```env
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=StrongPassword123
```

### 3) Set up the PostgreSQL database

Create the database first, then apply the Prisma migrations.

The schema is not hand-written SQL in the app runtime. Instead, it is managed through Prisma migrations located in `prisma/migrations/`. Running the migration command will create:

- `users`
- `drops`
- `reservations`
- `purchases`

along with the enums, foreign keys, and indexes defined in `prisma/schema.prisma`.

### 4) Generate Prisma Client and apply the schema

For a fresh local database, run:

```bash
npm run prisma:generate
npm run prisma:migrate
```

`npm run prisma:migrate` runs `prisma migrate dev`, which applies the SQL migrations to PostgreSQL and keeps the generated client in sync with the schema.

If you only need to regenerate the client after a schema change:

```bash
npm run prisma:generate
```

### 5) Start the app

Development mode:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

### 6) Create an admin account

To create or update an admin user:

```bash
npm run create:admin
```

Make sure `ADMIN_USERNAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are set before running it.

---

## Database Schema Setup

The schema lives in `prisma/schema.prisma` and is applied through Prisma migrations.

### Core tables

- `users`
  - stores user identity and hashed password
  - includes a `role` field for `USER` / `ADMIN`

- `drops`
  - stores the drop metadata
  - tracks `total_stock`, `available_stock`, `status`, `starts_at`, and `ends_at`

- `reservations`
  - stores a temporary hold for one user on one drop
  - tracks `status`, `reserved_at`, `expires_at`, and `completed_at`

- `purchases`
  - stores completed purchases
  - one purchase row is tied to exactly one reservation

### Important indexes / constraints

- unique email and username on `users`
- unique `reservation_id` on `purchases`
- indexes on reservation expiry and drop status fields for fast lookups
- foreign keys between reservations/purchases and their parent records

If you want to inspect the exact SQL that gets applied, open the files under `prisma/migrations/*/migration.sql`.

---

## Runtime Flow

### Reservation flow

1. A logged-in user requests `POST /api/v1/drops/:dropId/reserve`
2. The service locks the target drop row
3. It checks that the drop has started, has not ended, and still has stock
4. It ensures the same user does not already have an active reservation for that drop
5. It decrements stock and creates a reservation
6. It sets `expiresAt` to 60 seconds after the reservation timestamp
7. It broadcasts stock and reservation updates through Socket.IO

### Purchase flow

1. A logged-in user requests `POST /api/v1/reservations/:reservationId/purchase`
2. The reservation row is locked
3. Ownership, status, and expiry are checked
4. A purchase record is created
5. The reservation is marked `COMPLETED`
6. A purchase-completed event is broadcast

### Drop listing flow

- `GET /api/v1/drops/active` returns active drops with pagination
- `GET /api/v1/drops/:dropId` returns one drop plus recent buyers

---

## Architecture Choice: 60-Second Expiration Logic

The reservation window is hard-coded in the reservation service:

```ts
const RESERVATION_WINDOW_MS = 60_000;
```

When a reservation is created, the backend stores an absolute `expiresAt` timestamp in the `reservations` table. That matters because expiration is then based on a database value, not on in-memory timers that would disappear if the process restarts.

Expiration cleanup is handled by a background worker:

- `src/jobs/reservation-expiration.worker.ts`
- runs every 5 seconds
- processes at most 100 due reservations per batch
- calls `expireDueReservationsBatch(...)`

The expiration service does the cleanup inside a single Prisma transaction:

1. select due `ACTIVE` reservations where `expires_at <= NOW()`
2. lock them with `FOR UPDATE SKIP LOCKED`
3. mark those reservations as `EXPIRED`
4. lock the related drop rows
5. restore the stock back to the drop
6. set the drop status to:
   - `ENDED` if the drop window is already over
   - `ACTIVE` if stock is available again
   - `SOLD_OUT` if stock is still zero

That design gives three benefits:

- expiry still works after restarts
- cleanup can be run safely by multiple app instances
- stock is restored atomically with the reservation expiry

The worker also emits:

- `reservation_expired`
- `stock_updated`

through Socket.IO so the frontend can update instantly.

---

## Concurrency: Preventing Multiple Users from Claiming the Same Last Item

The reservation flow uses a row-level lock on the drop before stock is decremented.

The key part is:

- `reserveDropItem(...)` runs inside a transaction
- `lockDropById(...)` reads the drop with `FOR UPDATE`
- the transaction checks `available_stock`
- the transaction decrements stock only after the lock is held

That means if two users try to reserve the last item at the same time:

1. the first transaction locks the drop row
2. the second transaction waits for that row lock
3. the first transaction decrements stock and commits
4. the second transaction resumes, sees the updated stock, and fails with `SOLD_OUT`

So the same last item cannot be claimed twice.

There is also a safety check for duplicate reservations by the same user on the same drop:

- the service rejects a new reservation if the user already has an `ACTIVE` reservation for that drop

For purchase completion, the reservation row is locked too:

- `lockReservationById(...)` uses `FOR UPDATE`
- `purchases.reservation_id` is unique
- this prevents duplicate purchases for the same reservation

---

## Environment Variables

| Variable       | Required | Description                            |
| -------------- | -------: | -------------------------------------- |
| `DATABASE_URL` |      Yes | PostgreSQL connection string           |
| `JWT_SECRET`   |      Yes | Secret used to sign access tokens      |
| `CORS_ORIGIN`  |      Yes | Allowed frontend origin                |
| `PORT`         |       No | Server port, defaults to `4000`        |
| `NODE_ENV`     |       No | `development`, `test`, or `production` |

For the admin bootstrap script:

| Variable         | Required |
| ---------------- | -------: |
| `ADMIN_USERNAME` |      Yes |
| `ADMIN_EMAIL`    |      Yes |
| `ADMIN_PASSWORD` |      Yes |

---

## API Summary

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Drops

- `GET /api/v1/drops/active`
- `GET /api/v1/drops/:dropId`
- `POST /api/v1/drops` (admin only)

### Reservations / Purchases

- `POST /api/v1/drops/:dropId/reserve`
- `POST /api/v1/reservations/:reservationId/purchase`

### Health

- `GET /api/v1/health`

---

## Real-Time Events

Socket.IO events emitted by the backend:

- `connected`
- `stock_updated`
- `reservation_created`
- `reservation_expired`
- `purchase_completed`

These events are emitted from the backend after the transaction succeeds so the UI can stay in sync with the database state.

---

## Notes

- The app uses JWT auth with a 1-hour access token lifetime.
- Passwords are hashed with bcrypt.
- Rate limiting is enabled for API and auth routes.
- The service is already structured for transaction-safe inventory handling.
