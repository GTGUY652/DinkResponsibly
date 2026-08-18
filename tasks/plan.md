# Implementation Plan: Backend Security Fixes

## Overview
This plan outlines the sequential tasks to lock down the Supabase database (RLS + RPC), enforce atomic double-booking prevention, update frontend service methods, and patch dependencies.

## Architecture Decisions
- **`EXCLUDE` constraint for overlaps**: We will enable the `btree_gist` extension in a new Supabase migration and apply an exclusion constraint on `court_id`, `booking_date`, and `int4range(start_hour, end_hour)`. This is the most bulletproof way to prevent calendar overlaps in Postgres.
- **RPC for Calendar Availability**: We will create a `get_booked_slots(query_date)` PostgreSQL function that bypasses RLS using `SECURITY DEFINER`. This allows the calendar to read anonymous slot times while the underlying `bookings` table `SELECT` policy is completely shut off from the public.

## Task List

### Phase 1: Database Foundation (Migrations)
- [ ] Task 1: Create migration for `btree_gist` extension and `EXCLUDE` constraint on bookings.
- [ ] Task 2: Create migration for `get_booked_slots` RPC function and fix `bookings` RLS policies (revoke public SELECT/UPDATE/DELETE, keep public INSERT).

### Checkpoint: Foundation
- [ ] Migrations applied successfully to local/remote database.
- [ ] Direct SQL queries confirm overlapping inserts fail.
- [ ] Anonymous Supabase API queries confirm `SELECT` on `bookings` is blocked.

### Phase 2: Frontend Integration
- [ ] Task 3: Update `fetchBookedSlots` in `bookingService.ts` to use `supabase.rpc('get_booked_slots')`.
- [ ] Task 4: Remove client-side overlap check in `createBooking` and implement error handling to catch the Postgres exclusion violation (`23P04`), returning a specific error message.
- [ ] Task 5: Update the checkout UI (`AvailabilitySection.tsx`) to display the specific toast error message and trigger a calendar refresh when the double booking error is caught.

### Checkpoint: Core Features
- [ ] Calendar loads correctly without exposing PII.
- [ ] Simultaneous booking attempts result in a graceful UI rejection for the slower user.

### Phase 3: Dependencies
- [ ] Task 6: Run `npm audit fix` to resolve `nanoid` vulnerability.

### Checkpoint: Complete
- [ ] All acceptance criteria met.
- [ ] Ready for review.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| `btree_gist` extension not supported | High | Supabase supports it natively. We will verify during the local migration test. |
| Admin dashboard breaks due to RLS | Med | We will ensure the `role IN ('OWNER', 'STAFF')` policy covers all admin queries in `bookingService.ts`. |
