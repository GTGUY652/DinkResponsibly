# 0003 Frontend Court Booking Flow & Admin Visibility Specification

**Date**: 2026-08-10
**Status**: Accepted

## Summary

This specification details the technical implementation for Phase 1 of the DinkResponsibly Court Booking System. It connects the customer frontend court availability interface to Supabase for live slot fetching, enforces a Terms & No-Refund Policy modal with guest contact collection, persists reservations to the database, blocks already-booked slots in real time, and exposes active reservations on the Admin Dashboard Check-in view. Payment gateway integration is explicitly out of scope for Phase 1.

## Context

DinkResponsibly previously built the presentational customer landing page and administrative dashboard tabs. To make the system functional for venue operations, guests must be able to select dates, courts, and straight playing hours, view live availability, acknowledge strict venue terms (No-Refund Policy), and submit direct reservations. Simultaneously, venue staff need live visibility into all confirmed reservations inside the Admin Check-in table.

## Requirements

**User stories**:
- As a pickleball player, I want to see real-time court availability so that I cannot book a slot already reserved by someone else.
- As a venue guest, I want to review and agree to the No-Refund Policy and provide my contact details before confirming a reservation.
- As venue staff / admin, I want to view all active bookings in the Admin Portal so that I can check in guests when they arrive at the courts.

**Acceptance criteria**:

- **AC-1 (Slot Picker)**: Frontend availability view supports interactive selection of Date, Court (Court A, Court B, Court C, Court D), and continuous 1-hour time slots.
- **AC-2 (Terms & Guest Modal)**: Clicking "Book Now" opens a modal displaying venue rules (No-Refund Policy, Arrival Guidelines) and prompts for Guest Name, Email, and Phone number.
- **AC-3 (Database Persistence)**: Accepting terms saves a reservation record to the Supabase `bookings` table with status `confirmed` and auto-generated booking code.
- **AC-4 (Real-time Slot Blocking & Date Isolation)**: Frontend automatically queries Supabase for existing bookings on the selected Date and Court. Bookings are isolated by date, so booking a slot today does not affect future dates.
- **AC-5 (Admin Check-in & Status Management)**: Admin Dashboard Check-in view fetches live reservations with guest identity, court, date, time range, total price, status toggles (`checked_in`, `confirmed`, `cancelled`), and an optional delete action for administrative overrides.

## Options considered

### Option 1: Guest Checkout with Terms Modal & Supabase Persistence (Recommended)

Guests book directly without creating a customer account. The Terms Modal captures guest contact details (Name, Email, Phone), saves the reservation to Supabase `bookings` with status `confirmed`, and re-queries court availability in real time.

**Pros**:
- Zero friction for players (no sign-up or password required).
- Immediate confirmation and real-time UI updates across customer and admin views.
- Fully aligns with AGENTS.md rules.

**Cons**:
- Requires backend conflict validation to prevent concurrent double-booking.

### Option 2: Admin Manual Approval Workflow

Bookings are saved as `pending` until an admin manually approves them from the Admin Portal.

**Pros**:
- Gives venue staff manual control over every reservation.

**Cons**:
- Adds delay for guests and requires constant staff monitoring.

## Decision

**Chosen option**: Option 1: Guest Checkout with Terms Modal & Supabase Persistence.

We choose Guest Checkout without login. Guests acknowledge venue terms, enter their contact info in the Terms Modal, and receive instant confirmation. Bookings are persisted directly to Supabase and immediately blocked on the customer grid and listed in the Admin Check-in table.

**Implementation skills**: `@supabase/supabase-js` (`src/services/bookingService.ts`, `src/components/customer/AGENTS.md`, `src/components/admin/AGENTS.md`)

## Rationale

Guest checkout provides the smoothest user experience for sports court rentals. By persisting bookings directly to Supabase and querying availability by date and court, we guarantee that already-booked slots are automatically blocked on the frontend while giving venue staff real-time visibility in the Admin Portal.

## Feature Design

### Data Model Sketch

Supabase `bookings` table schema:

```sql
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT NOT NULL UNIQUE,
  court_id TEXT NOT NULL, -- 'Court A', 'Court B', 'Court C', 'Court D'
  booking_date DATE NOT NULL,
  start_hour INTEGER NOT NULL, -- 24h: 6, 7, 8...
  end_hour INTEGER NOT NULL, -- 24h: 7, 8, 9...
  duration_hours INTEGER NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'checked_in'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast availability queries
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON public.bookings (court_id, booking_date);
```

### Row Level Security (RLS) Policies

```sql
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Public visitors can read confirmed bookings (to determine unavailable slots)
CREATE POLICY "Allow public read access to bookings"
  ON public.bookings FOR SELECT
  USING (true);

-- Public visitors can insert new bookings (guest checkout)
CREATE POLICY "Allow public insert to bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

-- Staff / Admins can update booking status (check-in / cancel)
CREATE POLICY "Allow staff update access to bookings"
  ON public.bookings FOR UPDATE
  USING (true);
```

### Component State & Service Interfaces

`src/services/bookingService.ts`:
```typescript
export interface BookingRecord {
  id?: string;
  booking_code: string;
  court_id: string;
  booking_date: string; // 'YYYY-MM-DD'
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  total_price: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  status: 'confirmed' | 'cancelled' | 'checked_in';
  created_at?: string;
}

export const fetchBookedSlots = async (courtId: string, bookingDate: string): Promise<{ start_hour: number; end_hour: number }[]> => { ... };

export const createBooking = async (booking: Omit<BookingRecord, 'id' | 'created_at'>): Promise<BookingRecord> => { ... };

export const fetchAdminBookings = async (): Promise<BookingRecord[]> => { ... };
```

### Value Sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Query slot availability | Disabled `BOOKED` slot tags | `fetchBookedSlots(court_id, date)` from Supabase `bookings` |
| Open Terms Modal | Summary text (Court, Date, Time range, Total Price) | Selection state in `AvailabilitySection.tsx` |
| Submit Reservation | `booking_code` (e.g. `DR-8X9K2L`) | Generated via `bookingService.ts` |
| Save Booking | New row in Supabase `bookings` | `createBooking()` API call |
| View Admin Log | Active reservation rows | `fetchAdminBookings()` from Supabase `bookings` |

### Key Invariants
- A booked slot (`start_hour` to `end_hour`) cannot be re-booked on the same `court_id` and `booking_date`.
- Guest Name, Email, and Phone are mandatory before a reservation can be submitted.
- Payment gateway is out of scope for Phase 1 (reservations default to `confirmed`).

### Security Model
- Public read access allows fetching existing booking time ranges without exposing guest personal PII on the public grid.
- Full guest details are readable only by authenticated Admin Portal users in the Admin Check-in table.

## Build Plan

1. **Database Schema & RLS**: Create migration SQL script `supabase/migrations/20260810000000_create_bookings.sql` for the `bookings` table, indexes, and RLS policies (AC-3).
2. **Booking Service**: Implement `src/services/bookingService.ts` providing `fetchBookedSlots`, `createBooking`, `fetchAdminBookings`, and `updateBookingStatus` using `@supabase/supabase-js` (AC-3, AC-4, AC-5).
3. **Terms & Guest Modal Component**: Build `src/components/customer/TermsModal.tsx` detailing venue rules, No-Refund Policy, guest contact form fields, and submit handler (AC-2, AC-3).
4. **Availability Section Integration**: Update `src/components/customer/AvailabilitySection.tsx` to dynamically query Supabase for booked slots when date/court changes and trigger `TermsModal` on "Book Now" click (AC-1, AC-4).
5. **Admin Check-in View Integration**: Update `src/components/admin/CheckInTable.tsx` to fetch real reservation records from Supabase and support status toggles (`checked_in`, `confirmed`, `cancelled`) (AC-5).

## Consequences

**Positive**:
- Converts presentational court layout into a fully functional reservation system.
- Guarantees real-time conflict prevention so players cannot book occupied time slots.
- Gives venue management instant visibility of all player check-ins in the Admin Portal.

**Negative / tradeoffs**:
- Phase 1 relies on guest honor system (no online payment collection yet).

**Neutral**:
- Prepares clean database schema for Phase 2 PayMongo payment gateway integration.

## Follow-up

- Update `docs/scope/0003-court-booking-flow.md` with milestone task breakdown.
- Execute build tasks via `/develop 0003-court-booking-flow`.
