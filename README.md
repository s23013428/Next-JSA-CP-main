# JSA Play

JSA Play is a Next.js booking and management application for Jaffna Sports Academy. It uses MariaDB/MySQL for facilities, live slot availability, booking requests, administrators, sessions, and audit records.

## Local setup

1. Start Apache and MySQL in XAMPP.
2. Create an empty database named `ticket_jsa` in phpMyAdmin.
3. Copy `.env.example` to `.env.local` and update the database credentials if your MySQL account differs from XAMPP's default `root` account.
4. Install dependencies and initialize the database:

```bash
npm install
npm run db:setup
```

5. Start the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Customers create an account before reserving a slot and manage their bookings at [http://localhost:3000/account](http://localhost:3000/account). The administration portal is available at [http://localhost:3000/admin](http://localhost:3000/admin).

## Customer booking workflow

1. Create a customer account or sign in.
2. Choose a future facility slot and submit the booking request.
3. Follow pending, confirmed, completed, rejected, and cancelled bookings from **My bookings**.
4. Cancel a pending or confirmed booking online no later than 15 minutes before its scheduled start. The server enforces this cutoff and releases the slot after a successful cancellation.

## Demo administrator

- Email: `demo@gmail.com`
- Password: `123456`

The password is stored as a bcrypt hash in the database. Authentication creates an HTTP-only, eight-hour database-backed session.

## Database model

- `admins`: administrator accounts and password hashes
- `admin_sessions`: expiring authenticated sessions
- `users`: customer profiles and password hashes
- `user_sessions`: expiring, database-backed customer sessions
- `facilities`: sports facilities, rates, hours, and availability status
- `bookings`: customer-owned booking requests and review state
- `booking_slots`: unique reserved slots that prevent double-booking
- `audit_logs`: administrator actions for operational traceability

The idempotent schema and seed data are stored in `db/schema.sql`. Re-running `npm run db:setup` keeps existing operational data and restores required seed records without dropping tables.

## Validation

```bash
npm run lint
npm run build
```
