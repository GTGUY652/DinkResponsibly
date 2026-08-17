# Manual QR Code Payment & Receipt Approval Scope

**Workflow:** Beta
**Status:** in-progress

## Feature Scope

Replace the automated PayMongo payment redirect flow with a manual QR Code payment workflow and staff receipt approval:
- **Customer QR Payment Modal**: Display venue GCash/Maya QR code image alongside total court rate calculation, plus a receipt uploader allowing guests to attach their proof of payment screenshot (PNG/JPG/WEBP).
- **Supabase Storage Upload**: Store payment receipt screenshots in Supabase Storage (`payment-receipts` bucket) and create bookings with status `PENDING_VERIFICATION`.
- **Slot Reservation**: Bookings in `PENDING_VERIFICATION` reserve court slots immediately to prevent double-booking while staff inspects the payment proof.
- **Admin Receipt Lightbox**: Clicking the `Receipt` button in the Check-In table opens a receipt modal showing the uploaded payment proof screenshot next to booking & guest details.
- **Locked Approval Status**: When Staff/Owner changes status to `Approved`, update database status to `APPROVED` and lock the check-in status control permanently so it cannot be edited again.

**Done when:** Guests can scan the venue QR code, upload receipt proof, and submit a booking; staff/owner can view the receipt screenshot in the admin dashboard lightbox; and approving the check-in permanently locks the status.

- [x] Design it (spec): [0007-manual-qr-payment-and-receipt-approval.md](../specs/0007-manual-qr-payment-and-receipt-approval.md)
- [ ] Build it: /develop 0007-manual-qr-payment-and-receipt-approval
  - [ ] Update `bookings` schema with `receipt_url` and `PENDING_VERIFICATION` / `APPROVED` / `REJECTED` status constraint
  - [ ] Configure Supabase Storage `payment-receipts` bucket
  - [ ] Implement customer `QRCodePaymentModal` with receipt uploader and venue QR display
  - [ ] Update `bookingService.ts` for receipt upload, `PENDING_VERIFICATION` status creation, and slot holding
  - [ ] Update `CheckInTable.tsx` to handle status transitions and enforce read-only locked state for `APPROVED`
  - [ ] Update `ReceiptModal.tsx` to render the uploaded receipt screenshot image viewer
- [ ] Verify it: /check verify 0007-manual-qr-payment-and-receipt-approval
- [ ] Test it: /test 0007-manual-qr-payment-and-receipt-approval

Spec pointer: `docs/specs/0007-manual-qr-payment-and-receipt-approval.md` · code in `src/components/` and `src/services/`
