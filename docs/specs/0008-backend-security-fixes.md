# Spec: Backend Security Fixes (RLS, Double Bookings, Dependencies)

## Objective
Secure the DinkResponsibly booking system's backend data layer. The system currently suffers from completely open Row Level Security (RLS) policies exposing customer PII, a client-side race condition allowing double-booked courts, and a vulnerable `nanoid` dependency. We must fix these vulnerabilities while maintaining the frictionless guest checkout experience.

## Tech Stack
- React 19, Vite, TypeScript
- Supabase (PostgreSQL, `@supabase/supabase-js`)

## Commands
- Dev: `npm run dev`
- Test: `npm test`
- Lint: `npm run lint`

## Project Structure
- `supabase/migrations/` → Database schema, RLS policies, and RPC functions
- `src/services/` → Supabase client API wrappers (`bookingService.ts`)
- `src/components/customer/` → Frontend checkout and calendar views

## Code Style
```typescript
// Frontend RPC call example
export const fetchBookedSlots = async (bookingDate: string) => {
  const { data, error } = await supabase.rpc('get_booked_slots', { query_date: bookingDate });
  if (error) throw new Error('Failed to fetch availability');
  return data; // Returns anonymous { court_id, start_hour, end_hour }
};
```

## Testing Strategy
- Manual verification of API restrictions using an anonymous curl/fetch request to prove `SELECT`/`DELETE` are blocked.
- End-to-end race condition test: Triggering two simultaneous `createBooking` calls in the browser console to verify the database constraint rejects the second one.

## Boundaries
- **Always**: Use Postgres-level constraints for data integrity rather than application-level checks.
- **Ask first**: Before adding any new public `SELECT` policies to the bookings table.
- **Never**: Trust client-side overlap validation.

## Success Criteria
1. Anonymous/public users cannot `SELECT`, `UPDATE`, or `DELETE` from the `bookings` table.
2. The public calendar successfully loads taken slots via the `get_booked_slots` RPC function without exposing guest names or emails.
3. The database engine forcefully rejects overlapping bookings via an `EXCLUDE USING gist` constraint.
4. The frontend UI catches the database constraint error and displays: "This slot was just reserved by someone else. Please select a different time.", followed by an automatic calendar refresh.
5. `npm audit` reports 0 high-severity vulnerabilities.

## Open Questions
None. Scope is fully defined.
