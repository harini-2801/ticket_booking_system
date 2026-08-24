# System Design Document: District Ticket Booking Platform

## Executive Summary
This document details the expanded system design and technical architecture powering **District Pass**, an enterprise-grade event discovery and ticket booking platform inspired by Zomato District. The system resolves seat hoarding during high demand, double-booking race conditions, last-minute cancellation inventory waste, and provides seamless Food & Beverage (F&B) combo integration with calendar synchronization.

---

## 1. Seat Hold & TTL Mechanism

To grant customers sufficient checkout time while preventing inventory lockup, selected seats enter a **10-minute Time-To-Live (TTL)** hold window.

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
1. **Lazy Evaluation on Read**: Every seat map query (`GET /api/events/:id`) runs a database-level expiration check (`holdExpiresAt < NOW()`). Expired holds are instantly reset to `AVAILABLE`.
2. **Background Maintenance Cron**: A scheduled background worker (`/api/cron/release-holds`) periodically clears stale holds across all events and initiates automated waitlist seat allocation.

---

## 2. Concurrency Protection & Race Condition Prevention

High-demand events (e.g. Coldplay, IPL Finals) risk simultaneous seat selections. The system enforces Optimistic Concurrency Control (**OCC**) using atomic database transactions.

### Data Model Locking Fields
Each `ShowSeat` entity maintains:
- `status`: (`AVAILABLE`, `HELD`, `BOOKED`)
- `heldByUserId`: Nullable string ID of hold owner
- `holdExpiresAt`: Expiration timestamp
- `version`: Integer incremented on every mutation

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
- **Atomicity Guarantee**: If two users attempt to hold the exact same seat simultaneously, only one transaction updates 1 row; the second operation finds 0 matching rows (`version` mismatch) and fails gracefully with a `409 Concurrency Conflict` error.

---

## 3. Waitlist Auto-Assignment & Time-Limited Offer Flow

When an event category sells out, customers join a First-In, First-Out (**FIFO**) waitlist per `(eventId, seatCategory)`.

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

---

## 4. Food & Beverage (F&B) Combo Engine & Calendar Sync

1. **F&B Combo Add-ons**: Customers can select gourmet popcorn, nachos, sodas, or VIP Lounge passes during ticket checkout. F&B orders generate a dedicated voucher code alongside the entry QR ticket.
2. **iCalendar (.ics) Sync**: Confirmed bookings generate a standard RFC 5545 `.ics` file allowing 1-click event addition to Google Calendar and Apple Calendar.
