# Limited Edition Sneaker Drop — System Design Document

## 1. Overview

This project is a high-demand sneaker drop system where users can view active drops, reserve an item for 60 seconds, and complete a purchase before the reservation expires. The system must prevent overselling, update stock in real time, and show the latest successful buyers on each product card.

The design below starts simple and then evolves into a scalable version for high traffic.

---

## 2. Functional Requirements

### 2.1 View active drops

- Users can see all active sneaker drops.
- Each drop should show:
  - product name
  - total stock
  - available stock
  - status
  - drop start time
  - top 3 latest successful purchasers

### 2.2 Reserve one item

- A user can click **Reserve** on a drop.
- If stock is available, the system temporarily holds 1 item for that user.
- The reserved item cannot be claimed by other users during the reservation window.

### 2.3 Auto-expire reservation

- A reservation lasts for **60 seconds**.
- If the user does not complete checkout within that time, the reservation expires.
- The system must automatically return that 1 item to available stock.

### 2.4 Purchase flow

- A user can only purchase an item they currently reserved.
- If the reservation expired, purchase must fail.
- Once the purchase completes, the item is permanently deducted from stock.

### 2.5 Create a new drop

- An API must allow creating a new merch drop.
- No admin UI is required.
- The API should initialize stock and set drop timing.

### 2.6 Drop activity feed

- Each drop card must display the **3 most recent successful purchasers**.
- The API that lists active drops should include this nested buyer list.

### 2.7 Real-time updates

- Stock changes must be pushed to all connected clients using WebSockets.
- Users should see live changes without refreshing the page.

### 2.8 Prevent overselling

- If many users reserve at the same time, only one user may claim the last available item.
- The system must never allow stock to go below zero incorrectly.

### 2.9 User feedback

- The UI should show loading states for Reserve and Purchase actions.
- Errors should be visible and understandable.
- Stock changes should be clearly visible in the UI.

---

## 3. Non-Functional Requirements

### 3.1 Fast

- Pages should load quickly.
- Reservation and purchase actions should feel responsive.
- Stock updates should arrive in real time.

### 3.2 Correct

- Overselling must never happen.
- Expired reservations must return stock correctly.
- A user must not purchase without a valid reservation.

### 3.3 Reliable

- Failed requests should not leave the database in an inconsistent state.
- Expiration logic must continue to work even under traffic.

### 3.4 Real-time

- All connected clients should receive stock updates, reservation changes, and purchase events.

### 3.5 Scalable

- The system should handle many simultaneous users.
- It should still behave correctly during heavy reservation bursts.

### 3.6 Secure

- Users should only access their own reservation.
- Invalid or forged requests must be rejected.

### 3.7 Maintainable

- Reservation logic, purchase logic, and expiration logic should be separated.
- The code should be easy to extend later.

### 3.8 Observable

- Important events such as reservation creation, expiration, and purchase should be logged.

### 3.9 Consistent UX

- The UI should never show outdated stock for too long.
- Button states and error states should be clear.

---

## 4. Core Entities

### 4.1 User

Represents a person using the app.

Main fields:

- `id`
- `username`
- `email`
- `created_at`

Why it exists:

- to identify who reserved or purchased an item
- to show usernames in the activity feed

### 4.2 Drop

Represents one sneaker release event.

Main fields:

- `id`
- `title`
- `total_stock`
- `available_stock`
- `status`
- `starts_at`
- `ends_at`
- `created_at`
- `updated_at`

Why it exists:

- this is the product users are trying to reserve and buy
- stock is tracked here for quick reads

### 4.3 Reservation

Represents a temporary hold on one item.

Main fields:

- `id`
- `user_id`
- `drop_id`
- `status`
- `reserved_at`
- `expires_at`
- `completed_at`
- `created_at`
- `updated_at`

Common statuses:

- `ACTIVE`
- `EXPIRED`
- `COMPLETED`
- `CANCELLED`

Why it exists:

- to track who currently owns the hold
- to know when the hold must expire

### 4.4 Purchase

Represents a successful completed order.

Main fields:

- `id`
- `user_id`
- `drop_id`
- `reservation_id`
- `status`
- `purchased_at`
- `created_at`

Common statuses:

- `SUCCESS`
- `FAILED`

Why it exists:

- to record successful purchases
- to power the recent buyer feed

### 4.5 Activity feed data

This is derived from `purchases` and `users`.

Why it exists:

- the product card must show the 3 latest successful purchasers
- this can be built from a query over purchases joined with users

---

## 5. Relationships

- One user can have many reservations.
- One user can have many purchases.
- One drop can have many reservations.
- One drop can have many purchases.
- One reservation can lead to one purchase.

Simple summary:

- **User** = who is acting
- **Drop** = what is being sold
- **Reservation** = temporary hold
- **Purchase** = successful sale

---

## 6. API Design

### 6.1 Get active drops

**GET** `/api/drops/active`

Purpose:

- fetch all active drops
- include current stock
- include the top 3 latest successful purchasers for each drop

Typical response data:

- drop id
- title
- total stock
- available stock
- status
- starts_at
- recent buyers

### 6.2 Create a new drop

**POST** `/api/drops`

Purpose:

- create a new merch drop
- initialize the stock

Request body example:

- `title`
- `total_stock`
- `starts_at`
- `ends_at` (optional)

Behavior:

- store the drop
- set `available_stock = total_stock`
- set the initial status properly

### 6.3 Reserve one item

**POST** `/api/drops/:dropId/reserve`

Purpose:

- reserve 1 unit for a user
- reduce available stock temporarily
- create a reservation that expires in 60 seconds

Behavior:

- verify stock exists
- create reservation safely
- prevent overselling
- return reservation details

### 6.4 Complete purchase

**POST** `/api/reservations/:reservationId/purchase`

Purpose:

- complete checkout for a valid reservation

Behavior:

- verify the reservation belongs to the user
- verify it has not expired
- mark purchase as successful
- finalize the stock deduction

### 6.5 Get one drop

**GET** `/api/drops/:dropId`

Purpose:

- fetch one specific drop
- useful for product pages

### 6.6 WebSocket events

These are not HTTP APIs, but they are part of the system design.

Useful events:

- `stock_updated`
- `reservation_created`
- `reservation_expired`
- `purchase_completed`

These events keep all clients synchronized.

---

## 7. Database Design

The project uses PostgreSQL and Prisma.

### 7.1 `users`

Stores the people using the app.

Main fields:

- `id`
- `username`
- `email`
- `created_at`

### 7.2 `drops`

Stores each sneaker drop.

Main fields:

- `id`
- `title`
- `total_stock`
- `available_stock`
- `status`
- `starts_at`
- `ends_at`
- `created_at`
- `updated_at`

### 7.3 `reservations`

Stores temporary stock holds.

Main fields:

- `id`
- `user_id`
- `drop_id`
- `status`
- `reserved_at`
- `expires_at`
- `completed_at`
- `created_at`
- `updated_at`

### 7.4 `purchases`

Stores completed purchases.

Main fields:

- `id`
- `user_id`
- `drop_id`
- `reservation_id`
- `status`
- `purchased_at`
- `created_at`

### 7.5 Why `available_stock` lives in `drops`

The UI needs a fast stock number.

Example flow:

- start with 100
- 1 reserve → 99
- 1 expiration → 100
- 1 purchase → still permanently sold

Keeping the live stock count in `drops` makes reads simple and fast.

---

## 8. High-Level Design

### 8.1 Frontend

React app responsibilities:

- show active drops
- show stock counts
- show recent buyers
- allow reserve and purchase actions
- listen to WebSocket updates

### 8.2 Backend API

Node.js + Express responsibilities:

- handle drop creation
- handle reservations
- handle purchases
- enforce business rules
- send WebSocket updates

### 8.3 PostgreSQL

Postgres is the source of truth for:

- drop stock
- active reservations
- purchase history

### 8.4 WebSocket layer

Socket.io pushes live updates to all connected clients.

### 8.5 Expiration worker

A background job or scheduled process:

- checks expired reservations
- marks them expired
- returns stock
- emits live updates

---

## 9. End-to-End Flows

### 9.1 Reserve flow

1. User clicks Reserve.
2. Backend checks stock.
3. Backend creates reservation.
4. Backend reduces `available_stock` by 1.
5. Backend commits the transaction.
6. Backend emits a WebSocket update.
7. All connected users see the new stock.

### 9.2 Expiration flow

1. 60 seconds pass.
2. Background worker finds the expired reservation.
3. Backend marks it expired.
4. Backend returns 1 unit to `available_stock`.
5. Backend emits a WebSocket update.

### 9.3 Purchase flow

1. User clicks Complete Purchase.
2. Backend verifies the reservation is active and belongs to that user.
3. Backend records the purchase.
4. Backend marks the reservation as completed.
5. Backend emits a WebSocket update.

---

## 10. Concurrency and Atomic Reservation

This is the most important part of the system.

### Problem

If 100 users click Reserve at the same moment for the last 1 item, only one user should succeed.

### Solution

The reserve operation must be atomic.

The backend should:

1. start a database transaction
2. lock the specific drop row
3. check available stock
4. subtract 1
5. create the reservation
6. commit

If any step fails:

- rollback the transaction
- no stock is lost incorrectly

### Why this works

The database becomes the gatekeeper.
Only one request can safely take the last item.

---

## 11. Reservation Expiration Strategy

Reservations last for 60 seconds.

### Recommended simple approach

- Store `expires_at` on each reservation.
- Run a background job or scheduled task.
- Find active reservations older than 60 seconds.
- Mark them expired.
- Restore 1 unit of stock.
- Emit a WebSocket event.

### Important rule

Expiration must be idempotent.

That means:

- if the cleanup job runs twice, it should not return stock twice.

To achieve that:

- check reservation status before restoring stock
- only `ACTIVE` reservations may be expired

---

## 12. Recent Buyer Feed

Each active drop card must show the 3 most recent successful purchasers.

### Data source

- `purchases`
- joined with `users`

### Query behavior

- filter successful purchases for a drop
- sort by most recent purchase time
- take the top 3
- return usernames with the drop list response

### Why this matters

This gives the product card social proof and keeps the frontend simple.

---

## 13. Security and Validation

### 13.1 Authorization

- A user can only purchase their own reservation.
- A user cannot reserve or purchase on behalf of another user.

### 13.2 Validation

- title must be valid
- stock must be a positive integer
- reservation and purchase IDs must exist

### 13.3 Consistency checks

- cannot purchase an expired reservation
- cannot reserve when stock is 0
- cannot complete the same reservation twice

---

## 14. Optimization Path for High Traffic

### Phase 1 — Simple and correct

- PostgreSQL tables
- transaction-based reserve flow
- 60-second expiration job
- Socket.io updates

### Phase 2 — Faster reads

- add indexes
- cache active drop responses
- keep write path in the database

### Phase 3 — Horizontal scaling

- use shared pub/sub for WebSockets
- run multiple backend instances
- keep PostgreSQL as source of truth

### Phase 4 — Very large scale

- background queues for expensive work
- separate read models if needed
- further optimize hot endpoints

---

## 15. Recommended Indexes

Add indexes on:

- `drops.status`
- `drops.starts_at`
- `reservations.drop_id`
- `reservations.user_id`
- `reservations.status`
- `reservations.expires_at`
- `purchases.drop_id`
- `purchases.purchased_at`

Why:

- faster active drop lookup
- faster expiration cleanup
- faster buyer feed queries

---

## 16. Why This Design Works

This design is good because it is:

- simple enough to build quickly
- correct under concurrency
- real-time friendly
- easy to explain in an interview
- expandable for millions of users later

---

## 17. Final Summary

The system uses:

- **Users** to identify buyers
- **Drops** to represent sneaker releases
- **Reservations** to hold stock for 60 seconds
- **Purchases** to record successful checkout
- **WebSockets** for live stock updates
- **PostgreSQL transactions** to prevent overselling
- **Background expiration jobs** to return unused stock
