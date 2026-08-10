# Frontend Court Booking Flow & Admin Visibility

**Workflow:** Beta
**Status:** done

## Feature Scope

Connect the customer front end court booking interface with the backend database to enable live slot selection, terms acknowledgment modal, real-time slot blocking, and admin reservation visibility.

**Done when:** guests can pick dates, courts, and time slots, accept the no-refund terms modal, persist bookings to the database, see already-booked slots blocked on the UI, and admins can view active bookings in the admin panel.

- [x] Design it (spec): [0003](../specs/0003-court-booking-flow.md)
- [ ] Build it: /develop 0003-court-booking-flow
  - [x] Schema & RLS migration: bookings table, indexes, policies (AC-3)
  - [x] Booking service layer: Supabase API queries in src/services/bookingService.ts (AC-3, AC-4, AC-5)
  - [x] Terms & Guest Modal: venue rules and guest contact form in TermsModal.tsx (AC-2, AC-3)
  - [x] Availability UI integration: real-time booked slot fetching & blocking in AvailabilitySection.tsx (AC-1, AC-4)
  - [x] Admin Check-in UI integration: live reservation fetching and status toggles in CheckInTable.tsx (AC-5)
- [x] Verify it: /check verify 0003-court-booking-flow
- [x] Test it: /test 0003-court-booking-flow

Spec 0003 · code in `src/services/bookingService.ts`
