# Ticket Booking System 🎟️

A fullstack **Ticket Booking System** for movies and concerts built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma ORM, and SQLite / PostgreSQL. Features interactive real-time visual seat maps, 10-minute seat hold TTL auto-release, concurrency protection, automated waitlist reallocation, and instant QR code ticket email delivery.

---

## 🌟 Key Features & Highlights

- **Visual Seat Map**: Interactive visual grid with real-time seat status (`AVAILABLE`, `HELD`, `BOOKED`), row/seat numbers, category price indicators (VIP, PREMIUM, STANDARD), and live countdown timers.
- **Seat Hold & 10-Minute TTL**: Placing seats on hold reserves them for 10 minutes. Abandoned checkouts automatically release held seats back to the map.
- **Concurrency Protection**: Optimistic Concurrency Control (OCC) with atomic database transactions ensures two customers cannot hold or book the same seat simultaneously.
- **Automated Waitlist Reallocation**: When bookings are cancelled or held seats expire, the system automatically offers the seat to the next customer in the FIFO waitlist with a 10-minute claim window.
- **QR Ticket Email Delivery**: Confirmed bookings generate a unique ticket reference with an embedded QR code, delivered straight to customer emails.
- **Role-Based Auth (JWT)**: Dedicated workflows for **Customers**, **Organisers** (create event listings, set category pricing, view revenue analytics), and **Admins** (create venues, configure seat layout grids).
- **Vercel Ready**: Single repository Next.js fullstack structure optimized for instant Vercel deployment.

---

## 🚀 Setup & Local Installation Guide

### Prerequisites
- Node.js (v18+ or v20+)
- npm / pnpm / yarn

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/harini-2801/ticket_booking_system.git
cd ticket_booking_system
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (or copy `.env.example`):
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-ticket-booking-jwt-key-2026"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional SMTP Email Configuration (Leave blank to use mock console logger)
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="tickets@ticketmaster-demo.com"
```

### 3. Database Initialization & Seeding
Push the database schema and populate demo accounts, venues, events, seat maps, and sample bookings:
```bash
npx prisma db push
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Capabilities |
|---|---|---|---|
| **Customer** | `customer@demo.com` | `password123` | Browse events, select seats, hold 10m TTL, checkout QR ticket, view/cancel bookings. |
| **Waitlist User** | `waitlist.user@demo.com` | `password123` | Test waitlist queue and time-limited offer claim flow. |
| **Organiser** | `organiser@demo.com` | `password123` | Create movie/concert listings, set category prices, view occupancy & revenue stats. |
| **Admin** | `admin@demo.com` | `password123` | Manage venues, configure seat layout rows & seats per row. |

---

## 📚 Database Schema & Entity Relationships

```
+------------------+         +--------------------+         +-------------------+
|       User       |         |       Venue        |         |   SeatTemplate    |
+------------------+         +--------------------+         +-------------------+
| id               |         | id                 |         | id                |
| name             |         | name               |         | venueId (FK)      |
| email (unique)   |<---+    | location           |    +--->| row (e.g. 'A')    |
| password (hash)  |    |    | totalRows          |    |    | number (e.g. 1)   |
| role             |    |    | seatsPerRow        |    |    | category          |
+------------------+    |    +--------------------+    |    +-------------------+
        |               |              |               |              |
        |               |              v               |              v
        |               |    +--------------------+    |    +-------------------+
        |               +---|       Event        |----+    |     ShowSeat      |
        |                    +--------------------+         +-------------------+
        |                    | id                 |         | id                |
        |                    | title              |         | eventId (FK)      |
        |                    | category           |    +--->| seatTemplateId    |
        |                    | venueId (FK)       |    |    | status            |
        |                    | organiserId (FK)   |    |    | heldByUserId (FK) |
        |                    +--------------------+    |    | holdExpiresAt     |
        |                              |               |    | version           |
        |                              v               |    +-------------------+
        |                    +--------------------+    |              |
        |                    |    EventPricing    |    |              |
        |                    +--------------------+    |              |
        |                    | eventId (FK)       |    |              v
        |                    | seatCategory       |    |    +-------------------+
        |                    | price              |    |    |    BookingSeat    |
        |                    +--------------------+    |    +-------------------+
        |                                              |    | bookingId (FK)    |
        v                                              |    | showSeatId (FK)   |
+------------------+         +--------------------+    |    | price             |
|     Booking      |         |      Waitlist      |    |    +-------------------+
+------------------+         +--------------------+    |
| id               |         | id                 |    |
| bookingRef       |         | eventId (FK)       |----+
| userId (FK)      |         | userId (FK)        |
| totalAmount      |         | seatCategory       |
| status           |         | status             |
| qrCodeUrl        |         | offerExpiresAt     |
+------------------+         +--------------------+
```

---

## 📡 API Reference Documentation

### Authentication
- `POST /api/auth/register` - Create new user account (Customer, Organiser, Admin).
- `POST /api/auth/login` - Authenticate user & set JWT HTTP-only cookie.
- `POST /api/auth/logout` - Clear user session cookie.
- `GET /api/auth/me` - Fetch currently logged-in user profile.

### Venues (Admin / Organiser)
- `GET /api/venues` - List all configured venues with seat layout stats.
- `POST /api/venues` - Create new venue and auto-generate seat layout templates.

### Events (Public / Organiser)
- `GET /api/events?category=MOVIE&search=Inception` - Fetch and filter event listings.
- `POST /api/events` - Create event listing with date, venue, and per-category prices.
- `GET /api/events/:id` - Fetch event detail, visual seat grid status, and category waitlist counts.

### Seat Hold & Concurrency
- `POST /api/seats/hold` - Acquire 10-minute hold on selected seats with OCC concurrency locking.
- `POST /api/seats/release` - Explicitly release held seats.

### Bookings & Tickets
- `GET /api/bookings` - Fetch customer's booking history with QR code tickets.
- `POST /api/bookings` - Confirm booking for held seats, generate QR code, and send confirmation email.
- `POST /api/bookings/:id/cancel` - Cancel booking, release seats, and trigger waitlist auto-assignment.

### Waitlist Management
- `POST /api/waitlist` - Join waitlist queue for a sold-out seat category.
- `POST /api/waitlist/claim` - Claim a time-limited 10-minute waitlist offer.

### Organiser Dashboard
- `GET /api/organiser/summary` - Fetch occupancy rates, total ticket sales, and total revenue per event.

### Cron & Maintenance
- `GET /api/cron/release-holds` - Trigger cleanup of expired holds and waitlist offers.

---

## ⚙️ Concurrency & Waitlist Architecture

1. **Optimistic Concurrency Control (OCC)**:
   Seat hold requests execute an atomic `UPDATE ... WHERE version = expectedVersion AND status = 'AVAILABLE'` query. If two requests attempt to claim the exact same seat simultaneously, database versioning guarantees only one succeeds while the other fails with a clean concurrency conflict message.

2. **Waitlist Offer Reallocation**:
   When a booking is cancelled or a hold expires, the system queries the waitlist queue (sorted FIFO by `createdAt`). The top waiting user receives an email with a 10-minute time-limited claim link. If unclaimed before `offerExpiresAt`, the offer automatically advances to the next customer in line.

---

## ☁️ Vercel Deployment Instructions

1. Push your repository to GitHub (`main` branch).
2. Connect the repository in the [Vercel Dashboard](https://vercel.com).
3. Set environment variables in Vercel settings:
   - `DATABASE_URL`: PostgreSQL connection string (Neon / Supabase / Vercel Postgres).
   - `JWT_SECRET`: Random secure string.
4. Set Build Command: `npm run build` (runs `prisma generate && next build`).
5. Click **Deploy**!
