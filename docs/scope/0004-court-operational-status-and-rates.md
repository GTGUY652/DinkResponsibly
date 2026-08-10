# Court Operational Status & Live Dynamic Pricing Sync

**Workflow:** Beta
**Status:** done

## Feature Scope

Connect the customer court availability view with the backend `courts` table in Supabase to dynamically reflect court operational status (Operational vs Under Maintenance) and live hourly rate changes saved from the Admin Portal.

**Done when:** toggling a court to Under Maintenance in the Admin Portal automatically disables slot selection and displays an Under Maintenance badge on the customer frontend, and saving updated rates in the Admin Portal updates customer slot prices in real time.

- [x] Design it (spec): [0004](../specs/0004-court-operational-status-and-rates.md)
- [x] Build it: /develop 0004-court-operational-status-and-rates
  - [x] Add `fetchCourts()` helper in `bookingService.ts` to query `public.courts` (satisfies AC-1)
  - [x] Integrate live court fetching and Supabase Realtime subscription in `AvailabilitySection.tsx` (satisfies AC-1, AC-4)
  - [x] Render Under Maintenance state and disable slot selection for inactive courts (satisfies AC-2)
  - [x] Apply dynamic court rates (`weekday_day_rate`, `weekday_night_rate`, `weekend_rate`) to customer slot calculations (satisfies AC-3)
- [x] Verify it: /check verify 0004-court-operational-status-and-rates
- [x] Test it: /test 0004-court-operational-status-and-rates

Spec pointer: `docs/specs/0004-court-operational-status-and-rates.md`
