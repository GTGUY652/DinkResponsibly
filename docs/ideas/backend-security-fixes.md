# Backend Security Fixes

## Problem Statement
How might we lock down the system's backend data integrity so that unauthorized users cannot manipulate the bookings table, double-book courts, or compromise the system via vulnerable dependencies, without disrupting the existing direct guest checkout flow?

## Recommended Direction
**1. Row Level Security (RLS) Revamp**: 
Drop the overly permissive `USING (true)` policies. The `bookings` table will only allow `INSERT` from the public role. Only users with `role IN ('OWNER', 'STAFF')` will have `SELECT`, `UPDATE`, and `DELETE` privileges.

**2. Secure Availability RPC**: 
Since the frontend calendar needs to know which slots are taken without exposing customer names/emails, we will create a PostgreSQL function `get_booked_slots(query_date DATE)` that only returns `court_id`, `start_hour`, and `end_hour`.

**3. Database-Level Overlap Locks**:
Instead of relying on a Javascript-based `SELECT` followed by an `INSERT` (which causes a Time-of-Check-to-Time-of-Use race condition), we will enable the `btree_gist` extension and add an `EXCLUDE` constraint to the `bookings` table. The constraint will guarantee at the engine level that no two bookings can overlap for the same `court_id`, `booking_date`, and `int4range(start_hour, end_hour)`. If a conflict occurs, Postgres will reject it instantly. 

**4. Dependency Patching**: 
Run `npm audit fix` to resolve the `nanoid` ReDoS vulnerability.

## Key Assumptions to Validate
- [ ] Customers do not need a way to view, edit, or cancel their own bookings directly from a public URL after checkout (all sales final, guest checkout means no accounts).
- [ ] The `btree_gist` extension is available on the Supabase free tier (it is supported by default).
- [ ] The frontend can gracefully capture standard PostgreSQL constraint violation error codes (`23P04` Exclusion Violation) to trigger the "Slot reserved by someone else" toast.

## MVP Scope
- RLS policy updates for `bookings`.
- `get_booked_slots` RPC function creation.
- Update frontend `fetchBookedSlots` to use `supabase.rpc()`.
- Add `EXCLUDE` constraint to `bookings` table.
- Update frontend `createBooking` to catch constraint errors and refresh.
- Update `nanoid` dependency.

## Not Doing (and Why)
- **Receipt Image Uploads**: Out of scope for this sprint to keep the PR focused purely on data integrity.
- **Edge Functions (Emails / AI)**: Out of scope. Requires separate testing with external APIs.
