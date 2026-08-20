# Step by Step Court Booking Wizard UI Scope

**Workflow:** Beta
**Status:** in-progress

## Feature Scope

Redesign the customer court booking experience into a linear 5-step wizard interface:
- **Step 1 (Select Court)**: Choose an operational court (Court A, Court B, Court C, Court D) with dynamic rate cards and maintenance badges.
- **Step 2 (Pick Date)**: Interactive month calendar date picker with disabled past dates.
- **Step 3 (Pick Contiguous Time Slots)**: Choose 1-hour discrete slot blocks (e.g. 6:00 AM - 7:00 AM) with dynamic pricing rates and booked slot blocking; enforce contiguous slot selection for multi-hour play.
- **Step 4 (Guest Details & Venue Terms)**: Collect guest contact info (Name, Email, Phone) and require acknowledgement of strict venue rules and No-Refund Policy.
- **Step 5 (QR Payment & Receipt Upload)**: Display GCash/Maya QR code, capture last 4 digits of reference number, compress client-side receipt screenshot, and upload to Supabase Storage.
- **Step Navigation & Progress**: Top step indicator bar (1 to 5) with gated Next and Back controls.
- **Success View**: Render confirmed booking code and reservation summary upon completion.

**Done when:** Customers can navigate through the 5 steps sequentially, pick contiguous 1-hour slots, provide guest details with terms agreement, upload their payment receipt, and receive a confirmed booking code in a unified wizard.

- [x] Design it (spec): [0009-step-by-step-court-booking-wizard.md](../specs/0009-step-by-step-court-booking-wizard.md)
- [x] Build it: /develop 0009-step-by-step-court-booking-wizard
  - [x] Build `BookingWizard.tsx`, `StepIndicator.tsx`, and state container
  - [x] Implement `Step1CourtSelect.tsx` with court cards and status indicators
  - [x] Implement `Step2DateSelect.tsx` with calendar day selection
  - [x] Implement `Step3SlotSelect.tsx` with discrete 1-hour slot cards and contiguous selection validation
  - [x] Implement `Step4GuestDetails.tsx` with contact form validation and terms agreement
  - [x] Implement `Step5PaymentReceipt.tsx` with GCash QR, reference last 4, and receipt upload
  - [x] Integrate wizard into `AvailabilitySection.tsx` and implement `BookingSuccessView.tsx`
- [x] Verify it: /check verify 0009-step-by-step-court-booking-wizard
- [x] Test it: /test 0009-step-by-step-court-booking-wizard

Spec pointer: `docs/specs/0009-step-by-step-court-booking-wizard.md` · code in `src/components/customer/`
