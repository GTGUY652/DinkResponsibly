# 0007 Implementation Plan: Manual QR Payment & Receipt Approval

## Phases

### Phase 1: Storage and Schema Security
1. Create new migration for `bookings` schema expansion (`receipt_url`, `payment_reference_last4`).
2. Update the `status` CHECK constraint on the `bookings` table to handle `PENDING_VERIFICATION` and `REJECTED`.
3. Create the `payment-receipts` Supabase Storage bucket.
4. Apply Row Level Security (RLS) to the bucket: 
   - 5MB limit.
   - `image/png`, `image/jpeg`, `image/webp` restriction.
   - Public INSERT, Authenticated Admin READ.

### Phase 2: Client-Side Services
1. Create `src/utils/imageCompression.ts` (Native HTML5 Canvas compressor).
2. Update `src/services/bookingService.ts` to include `uploadPaymentReceipt`.
3. Update `createBooking` payload signature to accept new fields and default to `PENDING_VERIFICATION`.

### Phase 3: Frontend Multi-Step Wizard
1. Refactor `TermsModal.tsx` into a multi-step modal (`step = 1 | 2`).
2. Step 1: Terms & Conditions.
3. Step 2: Payment (QR Code display, Last 4 digits input, File uploader calling `imageCompression.ts`).

### Phase 4: Admin Approval Tools
1. Update `Admin Dashboard` to query new fields.
2. Build `ReceiptModal.tsx` to display the receipt and the reference digits.
3. Update `CheckInTable.tsx` to handle the `APPROVED` lock state and `REJECTED` state.
