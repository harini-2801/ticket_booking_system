# System Design Document: Ticket Booking System

## Executive Summary
This document details the architectural design and technical mechanisms powering the high-concurrency **Ticket Booking System**. The platform resolves key industry challenges: instant sell-outs during high demand, unsold inventory from last-minute cancellations, and double-booking race conditions during seat selection.

---

## 1. Seat Hold & TTL Mechanism

To prevent seat hoarding while granting customers adequate checkout time, seats are held under a configurable Time-To-Live (**TTL**) window of **10 minutes**.

```
[Customer Selects Seats] ---> [Atomic Hold Request] ---> [Status: HELD, Expiry: NOW + 10 min]
                                                                  |
                                      +---------------------------+---------------------------+
                                      |                                                       |
                             [Checkout Completed]                                    [Hold Expired / Abandoned]
                                      |                                                       |
                            [Status: BOOKED, QR Sent]                                [Status: AVAILABLE]
                                                                                              |
                                                                                   [Trigger Waitlist Queue]
```

### Expiry Enforcement & Auto-Release Strategy
1. **Lazy Evaluation on Read**: Every seat map query (`GET /api/events/:id`) or seat acquisition attempt runs a database-level expiration check. Held seats where `holdExpiresAt < NOW()` are immediately treated as available and lazily released.
2. **Background Cron Cleanup**: A lightweight scheduled background task (`/api/cron/release-holds`) periodically identifies expired holds, resets their status to `AVAILABLE`, and triggers waitlist auto-offers.

---

## 2. Concurrency Protection & Race Condition Prevention

High-demand events risk simultaneous seat requests from multiple users leading to double-booking. The system enforces strict optimistic concurrency control (**OCC**) using atomic database operations.

### Data Model Locking Fields
Each `ShowSeat` entity maintains:
- `status`: (`AVAILABLE`, `HELD`, `BOOKED`)
- `heldByUserId`: Nullable string ID of hold owner
- `holdExpiresAt`: Timestamp when hold expires
- `version`: Integer incremented on every status mutation

### Atomic Hold Acquisition Query
```sql
UPDATE "ShowSeat"
SET 
  "status" = 'HELD',
  "heldByUserId" = :currentUserId,
  "holdExpiresAt" = :newExpiryTime,
  "version" = "version" + 1
WHERE 
  "id" = :seatId 
  AND "version" = :expectedVersion
  AND (
    "status" = 'AVAILABLE' 
    OR ("status" = 'HELD' AND "holdExpiresAt" < NOW())
    OR "heldByUserId" = :currentUserId
  );
```
- **Atomicity Guarantee**: If two users attempt to hold the exact same seat simultaneously, only one transaction updates 1 row; the second operation finds 0 matching rows (`version` mismatch or status change) and fails gracefully with a `409 Concurrency Conflict` error.

---

## 3. Waitlist Auto-Assignment & Time-Limited Offer Flow

When an event or seat category sells out, customers can join a First-In, First-Out (**FIFO**) waitlist per `(eventId, seatCategory)`.

```
[Booking Cancelled / Hold Expired] 
             |
             v
   [Query Waitlist (FIFO)] -------------> [No Waiting Customers] ---> [Seat Released to Public]
             |
   [Customer Found in Queue]
             |
             v
 [Hold Seat for Waitlisted User]
             |
 [Status: OFFERED, OfferExpiresAt: NOW + 10 min]
             |
 [Dispatch Email Notification with Claim Link]
             |
             +---------------------------+---------------------------+
             |                                                       |
   [Claimed within 10 min]                                 [Unclaimed / Expired]
             |                                                       |
    [Proceed to Booking]                                  [Mark Status: EXPIRED]
                                                                     |
                                                          [Reallocate to Next in Line]
```

### Automated Reallocation Cycle
1. **Cancellation Event**: When a customer cancels a confirmed booking, the backend immediately releases the seats and invokes `processWaitlistForCategory()`.
2. **Offer Dispatch**: The top waitlist customer (`status = 'WAITING'`, sorted by `createdAt ASC`) is granted a time-limited offer (`status = 'OFFERED'`, `offerExpiresAt = NOW() + 10 min`). The system holds an available seat exclusively for them and dispatches a notification email with a direct claim URL.
3. **Expiry Escalation**: If the offered customer fails to claim within 10 minutes, the offer expires (`status = 'EXPIRED'`), releasing the seat to the next waiting customer in sequence.

---

## 4. QR Code Generation & Email Delivery Workflow

1. **Unique Reference**: Upon payment, a collision-resistant booking reference is created (e.g. `TKT-984210-4491`).
2. **QR Encoding**: The `qrcode` generator produces a high-density Base64 PNG Data URL encoding the reference and validation hash.
3. **Instant Email Dispatch**: Nodemailer delivers an HTML ticket email with inline embedded QR code for seamless venue gate scanning.
