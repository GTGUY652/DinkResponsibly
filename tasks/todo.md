# Tasks

## Phase 1: Database Foundation

### Task 1: Add Double Booking DB Constraint
**Description:** Create a new Supabase migration to enable `btree_gist` and add an `EXCLUDE` constraint preventing overlapping hours for the same court and date.
**Acceptance criteria:**
- [ ] `btree_gist` extension enabled.
- [ ] Constraint added combining `court_id`, `booking_date`, and `int4range(start_hour, end_hour)`.
**Verify:** Insert two overlapping bookings directly via SQL and verify the second one fails.
**Files:**
- `supabase/migrations/[timestamp]_double_booking_constraint.sql`

### Task 2: Fix RLS and Add RPC
**Description:** Create a migration to drop the insecure `USING (true)` RLS policies, replace them with strict Owner/Staff checks, and create the `get_booked_slots` RPC.
**Acceptance criteria:**
- [ ] Public can only `INSERT` to `bookings`.
- [ ] Admin/Staff can `SELECT`, `UPDATE`, `DELETE`.
- [ ] `get_booked_slots(query_date date)` function created returning `court_id`, `start_hour`, `end_hour`.
**Verify:** Try to fetch all bookings via anonymous REST API request; ensure it returns a 403/Empty set.
**Files:**
- `supabase/migrations/[timestamp]_rls_and_rpc.sql`

## Phase 2: Frontend Integration

### Task 3: Migrate to RPC for Availability
**Description:** Switch the calendar data fetching to use the new secure RPC instead of directly querying the table.
**Acceptance criteria:**
- [ ] `fetchBookedSlots` calls `supabase.rpc('get_booked_slots')` instead of `.from('bookings').select()`.
**Verify:** Load the customer homepage and verify the calendar still correctly renders grayed-out taken slots.
**Files:**
- `src/services/bookingService.ts`

### Task 4: Catch DB Constraint Errors
**Description:** Remove the vulnerable client-side `SELECT` overlap check and catch the native Postgres constraint error.
**Acceptance criteria:**
- [ ] Client-side overlap `SELECT` logic removed from `createBooking`.
- [ ] Catch block specifically detects exclusion violation or generic failure and throws "This court slot has already been reserved by another player."
**Verify:** Run `npm test` if any unit tests exist for this service, or manual inspection.
**Files:**
- `src/services/bookingService.ts`

### Task 5: UX for Race Condition Rejection
**Description:** Ensure the frontend displays the toast/alert and refreshes the calendar when the constraint error is thrown.
**Acceptance criteria:**
- [ ] Alert/Toast displays exact rejection reason.
- [ ] Availability fetch triggers automatically after the rejection to update the grid.
**Verify:** Manually test by inserting a conflicting row in the DB while the checkout modal is open, then clicking submit.
**Files:**
- `src/components/customer/AvailabilitySection.tsx`

## Phase 3: Dependencies

### Task 6: Patch Dependencies
**Description:** Fix the `nanoid` vulnerability.
**Acceptance criteria:**
- [ ] `npm audit` shows 0 high-severity issues.
**Verify:** Run `npm audit` in terminal.
**Files:**
- `package.json`
- `package-lock.json`
