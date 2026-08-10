# Verify: 0004-court-operational-status-and-rates · spec 0004 · updated 2026-08-10

_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / Manual

- [x] Load customer availability view → `fetchCourts()` queries Supabase table `public.courts` → AC-1
- [x] Select inactive court tab → displays "Maintenance" badge on tab, renders maintenance warning banner, and disables slot selection → AC-2
- [x] Change dates between weekday and weekend → timeline slot cards render dynamic rates (`weekday_day_rate`, `weekday_night_rate`, `weekend_rate`) → AC-3
- [x] Save rate or status updates in Admin Dashboard -> Supabase Realtime channel `realtime_customer_courts` updates customer browser view without refresh -> AC-4

## Commands

- [x] `npm test` → 11 unit tests pass including `fetchCourts` tests → AC-1, AC-3
- [x] `npm run build` → TypeScript typecheck and Vite production bundle succeed with 0 errors → AC-1, AC-2, AC-3, AC-4

## Acceptance-Criteria Coverage

- AC-1: Covered by `fetchCourts()` integration in `AvailabilitySection.tsx` and unit tests in `bookingService.test.ts`.
- AC-2: Covered by `.maintenance-badge`, `.court-maintenance-alert`, and disabled marker click handler.
- AC-3: Covered by dynamic slot rate calculation based on day of week and hour marker.
- AC-4: Covered by `supabase.channel('realtime_customer_courts')` Postgres changes subscription.
