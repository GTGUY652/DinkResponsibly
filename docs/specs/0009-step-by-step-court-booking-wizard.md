# 0009. Step by Step Court Booking Wizard UI

**Date**: 2026-08-20
**Status**: In Progress

## Summary

This specification outlines the technical design for redesigning the customer court booking experience into a linear step by step wizard. The new workflow replaces the side by side calendar and court schedule view with a progressive stepper interface. Customers navigate five clear stages (Select Court, Pick Date, Pick Contiguous Time Slots, Guest Details and Terms, and GCash QR Payment with Receipt Screenshot Upload). Each stage validates inputs before unlocking the Next control, and multi hour reservations enforce strict contiguous slot selection.

## Context

The current court booking section presents all selection surfaces at once in a two column grid. Visitors see the month calendar date picker, court selection tabs, session filter tabs, and the entire timeline grid of hourly markers simultaneously. While functional, presenting all choices at once can overwhelm first time guests. 

Moving to a guided step by step wizard breaks the decision making process into bite sized steps. Users first pick a court, then pick their date, then choose one or more contiguous 1-hour time slots (for example, 6:00 AM to 7:00 AM and 7:00 AM to 8:00 AM), fill in guest contact details with venue terms acknowledgement, and finalize by scanning the GCash QR code and uploading their payment receipt screenshot.

## Requirements

**User stories**:
- As a customer, I want to book a court through a sequential step by step wizard so that each decision is clear and manageable.
- As a customer, I want to select multiple 1-hour time slots easily while ensuring they form a continuous playing session.
- As a customer, I want clear Next and Back controls with a progress indicator so that I know exactly where I am in the reservation flow.
- As venue management, I want to prevent Swiss cheese orphan gaps by requiring single reservations to consist of contiguous time slots.

**Acceptance criteria**:
- **AC-1 (Step 1 Court Selection)**: User selects an active court (Court A, Court B, Court C, or Court D). Inactive courts display maintenance state and cannot be selected. Next button enables only after a valid court is chosen.
- **AC-2 (Step 2 Date Selection)**: User picks a valid reservation date from an interactive calendar date picker. Past dates are disabled. Next button enables only after a valid date is picked.
- **AC-3 (Step 3 Contiguous Slot Selection)**: Time slot grid displays 1-hour discrete slot blocks (for example, 6:00 AM to 7:00 AM, 7:00 AM to 8:00 AM) with dynamic pricing rates and booked/available status fetched from Supabase. Users can select one or more slots. If multiple slots are picked, they must be contiguous (adjacent with no gaps). Disjoint slot selection is blocked with an explanatory prompt. Next button enables only when at least one valid slot is selected.
- **AC-4 (Step 4 Guest Details and Venue Terms)**: User enters Guest Name, Email, and Phone number, and ticks the checkbox agreeing to the venue rules and No-Refund Policy. Next button enables only when all required contact fields are valid and terms are checked.
- **AC-5 (Step 5 QR Payment and Receipt Upload)**: User views the exact total calculated price and GCash/Maya QR code, enters the last 4 digits of the payment reference number, and uploads their receipt screenshot (compressed client side, restricted to image formats under 5MB). Clicking Submit creates the booking record in Supabase with status `PENDING_VERIFICATION` and uploads the receipt to the `payment-receipts` bucket.
- **AC-6 (Wizard Navigation and Progress)**: A step indicator bar displays current progress across Steps 1 through 5. Back navigation preserves all previously entered data, allowing users to adjust earlier choices without losing progress.
- **AC-7 (Confirmation Screen)**: Successful submission displays the booking confirmation code and a summary of the reserved court, date, and time range.

## Options considered

### Option 1: Full In-Card Step by Step Wizard (Recommended)

Replace the entire availability section with a unified multi-step wizard component. Each step renders its focused UI within the main card container, accompanied by a top progress tracker and sticky bottom navigation bar (Back and Next/Submit buttons).

**Pros**:
- Streamlined visual hierarchy with zero modal jumps.
- Clean mobile responsive layout that prevents scrolling fatigue.
- State is encapsulated cleanly within the wizard container.

**Cons**:
- Requires restructuring the current `AvailabilitySection.tsx` layout and styling.

### Option 2: Multi-Step Popup Modal

Keep the landing page minimal and open a large multi-step popup modal when the user clicks Book Court Now from the hero section.

**Pros**:
- Isolates booking logic completely into an overlay.

**Cons**:
- Modals on mobile devices can feel cramped for multi-step date and calendar interactions.
- Detaches court browsing from the natural landing page flow.

## Decision

**Chosen option**: Option 1: Full In-Card Step by Step Wizard.

We will rebuild the customer booking experience as a unified 5-step wizard component embedded directly in the `#availability` section.

**Implementation skills**: `@supabase/supabase-js`, `lucide-react`, React 19

## Rationale

Embedding the multi-step wizard directly on the page provides the best user experience on both desktop and mobile devices. Players can see their progression across the 5 steps without feeling boxed in by modal overlays. Enforcing contiguous slot selection in Step 3 prevents fragmented court utilization while keeping the interaction intuitive.

## Feature design

### Step Structure & Component Hierarchy

```
src/components/customer/
├── BookingWizard/
│   ├── BookingWizard.tsx          (Main wizard state orchestrator)
│   ├── BookingWizard.css          (Stepper & step card layout styling)
│   ├── StepIndicator.tsx          (Visual 1-5 progress bar with step labels)
│   ├── Step1CourtSelect.tsx       (Court selection cards with operational status)
│   ├── Step2DateSelect.tsx        (Interactive month calendar date picker)
│   ├── Step3SlotSelect.tsx        (Discrete 1-hour slot cards with contiguous selection logic)
│   ├── Step4GuestDetails.tsx      (Guest contact form and terms checkbox)
│   ├── Step5PaymentReceipt.tsx    (GCash QR display, reference last 4, receipt upload)
│   └── BookingSuccessView.tsx     (Confirmed reservation code & details)
```

### Contiguous Slot Selection Logic

1. Available slots are represented as an array of discrete 1-hour objects: `{ startHour: number, endHour: number, rate: number, isBooked: boolean, label: string }`.
2. When a user clicks an available slot:
   - If no slot is selected, `selectedSlots = [clickedHour]`.
   - If clicked slot is already selected:
     - If it is at the edge (minimum or maximum of currently selected range), deselect it.
     - If it is in the middle, deselect all slots or reset selection to the clicked slot.
   - If clicked slot is not selected:
     - If it is adjacent to the current range (`clickedHour === min - 1` or `clickedHour === max + 1`), add it to `selectedSlots`.
     - If it is non-adjacent, show a helper tooltip: "Please select consecutive time slots. To choose a different time, click your new start slot." and reset selection to the newly clicked slot.

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Step 1 Court Select | Active / Inactive Court list and hourly base rates | `courts` table / fallback in `bookingService.ts` |
| Step 2 Date Select | Calendar days, month navigation, selected day | Client state initialized to today |
| Step 3 Slot Select | Occupied slot markers, hour labels, dynamic rates | `fetchBookedSlots(court, date)` from Supabase `bookings` |
| Step 3 Slot Select | Total price calculation | Sum of rates for all selected contiguous slots |
| Step 4 Guest Details | Guest Name, Email, Phone, Agreed flag | Guest input fields with HTML5 validation |
| Step 5 Payment | GCash QR image, reference last 4, receipt image | User input & client side compressed file |
| Submit Booking | `booking_code`, DB record creation | `createBooking()` with `PENDING_VERIFICATION` status |

### Key invariants

- Only operational courts can be chosen in Step 1.
- Step 2 prohibits selecting dates prior to the current local date.
- Step 3 strictly blocks overlapping booked slots and enforces contiguous hours for multi-hour reservations.
- Step 4 requires valid Name, Email format, Phone number, and checked No-Refund acknowledgement.
- Step 5 requires 4 numeric digits for payment reference and an image screenshot under 5MB.

### Critical test scenarios

- Happy path: User selects Court A, picks tomorrow's date, selects 6:00 AM to 7:00 AM and 7:00 AM to 8:00 AM, enters guest details, uploads payment screenshot, and receives booking code, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**.
- Non-contiguous slot attempt: User selects 6:00 AM to 7:00 AM, then clicks 9:00 AM to 10:00 AM. System resets range or notifies user to select adjacent slots, verifying **AC-3**.
- Validation gating: Next button is disabled in Step 4 until valid email, phone, and terms checkbox are provided, verifying **AC-4**.
- Back navigation integrity: User proceeds to Step 4, clicks Back to Step 3 to change hours, and returns to Step 4 with guest information preserved, verifying **AC-6**.

## Build plan

1. **Step Indicator & Wizard Container**: Build `BookingWizard.tsx` with top step tracker (Steps 1 to 5), step navigation state management, and Back/Next action bar, satisfies **AC-6**.
2. **Court Selection Step**: Implement `Step1CourtSelect.tsx` rendering interactive court selection cards with maintenance badges and dynamic rates preview, satisfies **AC-1**.
3. **Date Selection Step**: Implement `Step2DateSelect.tsx` with clean month navigation, day grid, and past-date disabling, satisfies **AC-2**.
4. **Contiguous Slot Selection Step**: Implement `Step3SlotSelect.tsx` with discrete 1-hour slot cards (e.g. 6:00 AM to 7:00 AM), AM/PM session filters, booked slot disabling, and contiguous multi-hour selection validation, satisfies **AC-3**.
5. **Guest Details & Terms Step**: Implement `Step4GuestDetails.tsx` capturing name, email, phone, and No-Refund Policy agreement with validation, satisfies **AC-4**.
6. **QR Payment & Receipt Upload Step**: Implement `Step5PaymentReceipt.tsx` displaying the total price, GCash QR code, 4-digit reference input, client-side image compression, and Supabase storage upload, satisfies **AC-5**.
7. **Availability Section Integration & Confirmation**: Integrate the wizard into `AvailabilitySection.tsx`, removing redundant legacy components and displaying `BookingSuccessView.tsx` upon completion, satisfies **AC-7**.

## Consequences

**Positive**:
- Significantly simplified user journey with clear, progressive disclosure.
- Eliminates cognitive load of viewing the calendar, courts, and full timeline simultaneously.
- Cleanly prevents disjointed bookings while supporting flexible multi-hour play.

**Negative / tradeoffs**:
- Requires users to click through sequential steps rather than viewing all court schedules at a single glance.

**Neutral**:
- Reuses all existing Supabase tables, storage buckets, and backend RLS policies without requiring database migrations.

## Follow-up

- Create scope entry in `docs/scope/0009-step-by-step-court-booking-wizard.md`.
- Await user go signal before implementing code changes.
