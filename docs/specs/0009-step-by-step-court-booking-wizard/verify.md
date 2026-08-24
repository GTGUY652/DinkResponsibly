# Verify: Step by Step Court Booking Wizard UI · spec 0009 · updated 2026-08-20
_Steps derived from spec 0009 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Select Court A on Step 1 → court card highlighted with active border and checkmark → AC-1
- [x] Maintenance court state in Step 1 → disabled card, maintenance badge, cannot proceed → AC-1
- [x] Pick valid date in Step 2 calendar → selected date updated, past days disabled, rate banner reflects weekday/weekend → AC-2
- [x] Select 1-hour slot (6:00 AM–7:00 AM) in Step 3 → slot selected, summary updates hours and total price → AC-3
- [x] Select adjacent slot (7:00 AM–8:00 AM) in Step 3 → range expands to 2 continuous hours → AC-3
- [x] Click non-adjacent slot (9:00 AM–10:00 AM) in Step 3 → displays contiguous notice and resets selection to clicked slot → AC-3
- [x] Enter valid Guest Name, Email, Phone, and check terms in Step 4 → unlocks Next button → AC-4
- [x] Attempting invalid email or unchecked terms in Step 4 → displays validation warning and blocks Next → AC-4
- [x] View GCash QR code, enter 4-digit reference, and upload receipt screenshot in Step 5 → enables submit button → AC-5
- [x] Submit reservation in Step 5 → compresses image, uploads receipt to Supabase storage, creates booking with status `PENDING_VERIFICATION`, and navigates to Success View → AC-5, AC-7
- [x] Click Back button across any step (Steps 2–5) → preserves previously selected values without loss → AC-6
- [x] Copy booking code button in Success View → copies code to clipboard with visual feedback → AC-7
- [x] Click Book Another Court in Success View → resets wizard back to Step 1 for a new reservation → AC-7

## Commands
- [x] `npm test` → 33/33 tests pass across 3 test suites → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- [x] `npm run build` → TypeScript type checking and Vite build complete with 0 errors → AC-1 through AC-7

## Acceptance-criteria coverage
- AC-1 (Step 1 Court Selection): covered by UI step 1, 2 and unit test
- AC-2 (Step 2 Date Selection): covered by UI step 3 and unit test
- AC-3 (Step 3 Contiguous Slot Selection): covered by UI steps 4, 5, 6 and `BookingWizard.test.ts`
- AC-4 (Step 4 Guest Details & Terms): covered by UI steps 7, 8 and unit test
- AC-5 (Step 5 QR Payment & Receipt Upload): covered by UI step 9, 10 and unit test
- AC-6 (Wizard Navigation & State): covered by UI step 11 and unit test
- AC-7 (Confirmation View): covered by UI steps 12, 13
