# 0004. Court Operational Status & Live Dynamic Pricing Sync

**Date**: 2026-08-10
**Status**: Accepted

## Summary

This specification connects the customer court availability interface with the backend database table `public.courts` in Supabase. It enables real-time synchronization of court operational status (Operational vs Under Maintenance) and hourly rate changes configured in the Admin Portal. When an administrator deactivates a court or updates weekday/weekend hourly rates, these changes reflect instantly on open customer booking sessions using Supabase Realtime subscriptions.

## Context

In Phase 1 of the court booking system, the customer availability view ([`AvailabilitySection.tsx`](file:///C:/Tano/Group%209%20Booking%20System/DinkResponsibly/src/components/customer/AvailabilitySection.tsx)) rendered hardcoded court titles and fixed prices. Although the Admin Dashboard ([`RateController.tsx`](file:///C:/Tano/Group%209%20Booking%20System/DinkResponsibly/src/components/admin/RateController.tsx)) successfully saves status toggles (`is_active`) and dynamic hourly rates (`weekday_day_rate`, `weekday_night_rate`, `weekend_rate`) to the Supabase `public.courts` table, the frontend customer view did not query `public.courts` or listen to database state changes. Consequently, court maintenance toggles and rate adjustments made by venue owners were not enforced during customer slot selection.

## Requirements

**User stories**:
- As a court owner, I want court maintenance toggles and rate changes saved in the admin portal to take effect on the customer booking page immediately without requiring a frontend redeployment.
- As a customer, I want to see accurate hourly court rates and clear "Under Maintenance" notifications so I cannot reserve unavailable courts.

**Acceptance criteria**:
- **AC-1**: `AvailabilitySection.tsx` fetches live court records (`id`, `name`, `weekday_day_rate`, `weekday_night_rate`, `weekend_rate`, `is_active`) from Supabase table `courts` on mount and on date change.
- **AC-2**: When a court is marked inactive (`is_active === false`), its court tab on the customer frontend displays an "Under Maintenance" status tag, disables slot selection, and displays a clear maintenance alert banner.
- **AC-3**: Slot rates displayed on the customer timeline calculate dynamically based on the court's dynamic rates fetched from Supabase (Weekday 6 AM – 4 PM uses `weekday_day_rate`, Weekday 5 PM – 2 AM uses `weekday_night_rate`, Weekend uses `weekend_rate`).
- **AC-4**: A Supabase Realtime subscription on `public.courts` listens for database `UPDATE` events and updates court status and rates live on open customer browser sessions without page reloads.

## Options considered

### Option 1: Live Supabase Database Query + Realtime Channel (Chosen)

Fetch court operational statuses and rates directly from Supabase `public.courts` on page load and subscribe to Postgres changes via Supabase Realtime channel `realtime_courts`.

**Pros**:
- Instant live updates across customer browsers when admin saves rate or status changes.
- Ensures backend database is the single source of truth.

**Cons**:
- Requires handling loading and fallback states during network latency.

### Option 2: Hardcoded Frontend Constants

Keep court definitions static in React components.

**Pros**:
- Zero network queries on initial render.

**Cons**:
- Violates administrative control requirement; owner changes in admin panel have no effect.

## Decision

**Chosen option**: Option 1: Live Supabase Database Query + Realtime Channel.

Connect customer availability UI directly to Supabase `public.courts` table and attach a Realtime subscription for dynamic pricing and maintenance toggles.

## Rationale

Option 1 enforces the administrative court management requirement specified in the system overview. It leverages existing Supabase Realtime infrastructure already established in `CheckInTable.tsx` and `RateController.tsx`, maintaining consistency across the codebase.

## Feature design

**Data model sketch**:
Uses existing `public.courts` table in Supabase:
- `id` (text, PK): e.g., 'Court A', 'Court B', 'Court C', 'Court D'
- `name` (text): Court display name
- `weekday_day_rate` (numeric): Daytime rate (6 AM – 4 PM)
- `weekday_night_rate` (numeric): Nighttime rate (5 PM – 2 AM)
- `weekend_rate` (numeric): Weekend rate (Sat – Sun)
- `is_active` (boolean): `true` for Operational, `false` for Under Maintenance

**API surface**:
| Query / Channel | Event | Target Table | Description |
|---|---|---|---|
| `supabase.from('courts').select('*')` | `SELECT` | `public.courts` | Fetches active court list and pricing rules |
| `supabase.channel('realtime_courts')` | `postgres_changes` | `public.courts` | Listens for live update events from admin portal |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Select court tab | Operational vs Under Maintenance status | `courts.is_active` column |
| Render timeline slot price | Slot hourly rate (₱) | `weekday_day_rate`, `weekday_night_rate`, or `weekend_rate` column depending on day of week and hour |
| Slot click on inactive court | Disabled interaction + Alert banner | Evaluates `court.is_active === false` |

**Security model**:
- `public.courts` table allows `SELECT` access to all users (public customer view).
- `UPDATE` access is restricted to authenticated Admin/Owner profiles via RLS policies.

**Critical test scenarios**:
- Happy path: Selecting an active court loads live custom dynamic rates from Supabase, verifies **AC-1**, **AC-3**.
- Maintenance path: Selecting a deactivated court displays "Under Maintenance" badge and disables hour slot selection, verifies **AC-2**.
- Live Realtime sync: Admin toggles power button in Rate Controller and saves, customer page updates without refresh, verifies **AC-4**.

## Build plan

1. Add Supabase query function `fetchCourts()` to `bookingService.ts` to retrieve records from `public.courts`, satisfies **AC-1**.
2. Integrate `fetchCourts()` and Supabase Realtime channel subscription in `AvailabilitySection.tsx`, satisfies **AC-1**, **AC-4**.
3. Implement "Under Maintenance" UI badge, disabled slot state, and maintenance alert when `court.is_active === false`, satisfies **AC-2**.
4. Update timeline slot rate calculator to use `court.weekday_day_rate`, `court.weekday_night_rate`, and `court.weekend_rate` from fetched court data, satisfies **AC-3**.

## Consequences

**Positive**:
- Venue owners can manage court pricing and maintenance toggles with instant live updates on the website.
- Eliminates hardcoded price assumptions.

**Negative / tradeoffs**:
- Adds a small initial network query (`fetchCourts`) on customer page load.
