# 0007. Manual QR Code Payment Scanning & Admin Receipt Approval Workflow

**Date**: 2026-08-11  
**Status**: Proposed  

## Summary

This specification defines the transition from automated PayMongo payment redirects to a manual QR Code payment scanning and proof of payment upload workflow. Customers scan a venue GCash or Maya QR code image, complete payment in their digital wallet app, and upload a screenshot of their transaction receipt when booking. Court staff or owners then inspect the uploaded receipt image in an admin lightbox modal and approve the check-in, permanently locking the booking status so it cannot be edited again.

## Context

Automated payment gateways like PayMongo require API setup, business registration, and webhook handling, which can add transaction friction and fees for local sports venues. Venue operators frequently prefer displaying a GCash or Maya QR code image directly on the website, allowing players to pay using their existing mobile banking apps and upload a screenshot of their payment confirmation.

The system must ensure that uploaded receipt screenshots are stored securely in Supabase Storage, court time slots are held immediately upon receipt upload to prevent double-booking, and venue staff can view the uploaded receipt image side-by-side with guest details to approve the reservation. Once approved by staff, the check-in status must become locked to prevent accidental or unauthorized state changes.

## Requirements

**User stories**:
- As a customer, I want to scan the venue QR code and upload my payment receipt screenshot so that I can reserve my pickleball court slot without creating an account.
- As court staff/owner, I want to view the guest's uploaded receipt image in the admin check-in table so that I can verify payment legitimacy and approve the booking.
- As court staff/owner, I want approved check-in statuses to become locked so that confirmed reservations cannot be altered accidentally.

**Acceptance criteria**:
- **AC-1**: Customer booking confirmation modal displays venue GCash/Maya QR code image, total price calculation, payment instructions, and a receipt screenshot uploader (PNG/JPG/WEBP).
- **AC-2**: Submitting a booking uploads the payment receipt image to Supabase Storage (`payment-receipts` bucket) and creates a `bookings` record with initial status `PENDING_VERIFICATION`.
- **AC-3**: Interactive availability calendar treats both `PENDING_VERIFICATION` and `APPROVED` bookings as occupied slots to prevent double-bookings.
- **AC-4**: Clicking the `Receipt` button in the Admin Check-In table opens `ReceiptModal` displaying the uploaded receipt image side-by-side with guest contact and reservation details.
- **AC-5**: Changing status to `APPROVED` updates PostgreSQL database status and renders a green locked badge or disabled dropdown in the Check-In table.
- **AC-6**: Once a booking status is `APPROVED`, the status selector becomes locked and read-only, preventing any subsequent edits.

## Options considered

### Option 1: Automated PayMongo API Checkout Redirect
Redirect users to a hosted PayMongo checkout session requiring API webhooks and live payment provider verification.

**Pros**:
- Instant automated verification without human staff intervention.

**Cons**:
- Requires business registration, transaction processing fees, and complex webhook retry mechanisms.

### Option 2: Manual QR Code Payment with Receipt Screenshot Upload & Staff Approval (Chosen)
Display GCash/Maya QR code image on screen, collect player's payment receipt screenshot, upload to Supabase Storage, and provide a staff receipt lightbox viewer with locked approval status.

**Pros**:
- Direct zero-fee local payment method popular in the Philippines (GCash/Maya).
- Gives venue staff full control to inspect actual receipt images before final venue entry.
- Simple, reliable, and user-friendly.

**Cons**:
- Requires staff to inspect receipt screenshots for verification.

## Decision

**Chosen option**: Option 2: Manual QR Code Payment with Receipt Screenshot Upload & Staff Approval

## Rationale

Manual QR Code payments accurately reflect the operational reality of local Philippines sports venues like pickleball clubs, where GCash and Maya QR scanning is standard practice. Allowing guests to upload their payment screenshot directly in the booking drawer and granting staff a clear lightbox viewer ensures seamless venue verification. Locking the status upon approval guarantees data integrity and prevents check-in tampering.

## Feature design

**Data model sketch**:
- Table `public.bookings`:
  - `id`: UUID (PK, default `gen_random_uuid()`)
  - `booking_reference`: TEXT (UNIQUE, e.g. `DR-2J61TW`)
  - `guest_name`: TEXT
  - `guest_email`: TEXT
  - `guest_phone`: TEXT
  - `court_id`: UUID (FK `public.courts.id`)
  - `start_time`: TIMESTAMPTZ
  - `end_time`: TIMESTAMPTZ
  - `total_price`: NUMERIC(10, 2)
  - `status`: TEXT (CHECK status IN (`PENDING_VERIFICATION`, `APPROVED`, `REJECTED`, `CANCELLED`))
  - `receipt_url`: TEXT (Supabase Storage public/signed URL)
  - `created_at`: TIMESTAMPTZ
- Storage Bucket: `payment-receipts` (public read for authenticated admins/staff)

**State transitions**:
- `Customer submits booking + receipt` -> `PENDING_VERIFICATION`
- `Staff verifies receipt & approves` -> `APPROVED` (State becomes locked and non-editable)
- `Staff rejects invalid receipt` -> `REJECTED` (Slot released back to availability calendar)

**API / Service surface**:
| Method / Service | Input | Output | Purpose |
|---|---|---|---|
| `uploadPaymentReceipt(file)` | `File` | `receipt_url: string` | Uploads screenshot image to `payment-receipts` bucket |
| `createBooking(bookingData)` | Guest details, court, slots, `receipt_url` | `Booking` object | Saves booking record with `PENDING_VERIFICATION` |
| `updateBookingStatus(id, status)` | `bookingId: string`, `status: string` | Updated `Booking` | Updates status in DB (only if current status is not `APPROVED`) |
| `fetchBookedSlots(date)` | `date: string` | Array of booked slot ranges | Returns occupied slots (`PENDING_VERIFICATION` & `APPROVED`) |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Submit booking | `receipt_url` | Uploaded file response from Supabase Storage `payment-receipts` bucket |
| Render availability grid | Occupied slots | `start_time` and `end_time` of `PENDING_VERIFICATION` and `APPROVED` bookings |
| Click `Receipt` button | Receipt image display | `bookings.receipt_url` field |
| Status dropdown change | Locked state | Computed `isLocked = booking.status === 'APPROVED'` |

**Key invariants**:
- If `booking.status === 'APPROVED'`, status dropdown controls MUST be disabled and non-editable.
- Slots for `PENDING_VERIFICATION` and `APPROVED` bookings MUST both be excluded from open calendar availability.

**Security model**:
- Public users can upload receipt images to `payment-receipts` bucket and insert new bookings.
- Admin/Staff users authenticated via Supabase Auth can read all bookings, view receipt images, and update booking status.

**Configuration required**:
- `VITE_SUPABASE_STORAGE_URL`: Base URL for Supabase Storage buckets.
- Asset `public/assets/gcash_qr.png`: QR Code image graphic displayed during checkout.

**Critical test scenarios**:
- Happy path customer: Customer selects slots, scans QR, uploads receipt image, receives reference code `DR-XXXXX`, verifies **AC-1, AC-2, AC-3**.
- Happy path staff verification: Staff logs in, views `PENDING_VERIFICATION` booking, opens `ReceiptModal` to inspect uploaded receipt image, clicks approve, verifies **AC-4, AC-5**.
- Locked state verification: Staff attempts to change status of an `APPROVED` booking, verifies controls are disabled and locked, verifies **AC-6**.

## Build plan

1. **Database Schema & Storage Setup**: Update `20260806_admin_dashboard.sql` to add `receipt_url TEXT` column, update `bookings.status` check constraint (`PENDING_VERIFICATION`, `APPROVED`, `REJECTED`), and configure `payment-receipts` storage bucket, satisfies **AC-2, AC-5**.
2. **Booking Service & Storage Integration**: Update `src/services/bookingService.ts` to implement `uploadPaymentReceipt`, default new bookings to `PENDING_VERIFICATION`, and update `fetchBookedSlots` to include `PENDING_VERIFICATION` slots, satisfies **AC-2, AC-3**.
3. **Customer QR Payment & Upload Modal**: Create `QRCodePaymentModal.tsx` featuring calculated price summary, GCash/Maya QR code display (`gcash_qr.png`), screenshot file picker, and submit handler, satisfies **AC-1, AC-2**.
4. **Admin Receipt Lightbox Viewer**: Update `ReceiptModal.tsx` to render the uploaded receipt screenshot (`receipt_url`) side-by-side with guest & reservation details when staff clicks `Receipt` button, satisfies **AC-4**.
5. **Admin Check-In Table Status Approval & Locked State**: Update `CheckInTable.tsx` status selector to render `Pending Verification`, `Approved`, `Rejected` options, and lock the control (`disabled={status === 'APPROVED'}`) once approved, satisfies **AC-5, AC-6**.
6. **Automated Unit & Integration Tests**: Update Vitest test suite (`bookingService.test.ts`, `customerComponents.test.ts`) to verify receipt uploads, status state locks, and availability slot filtering, satisfies **AC-1, AC-2, AC-3, AC-4, AC-5, AC-6**.

## Consequences

**Positive**:
- Simplifies payment process for local Philippine guests using familiar GCash/Maya QR scanning.
- Eliminates third-party gateway transaction fees and webhooks.
- Gives venue staff visual receipt verification and enforces locked approval state integrity.

**Negative / tradeoffs**:
- Requires staff to inspect uploaded payment screenshots to verify transactions.

## Follow-up

- [ ] Add actual venue GCash/Maya QR code image file to `public/assets/gcash_qr.png`.
