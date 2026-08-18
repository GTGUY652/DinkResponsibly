# 0007. Manual QR Code Payment Scanning & Admin Receipt Approval Workflow

**Date**: 2026-08-18  
**Status**: Approved (Revised)

## Summary

This specification defines the transition from automated PayMongo payment redirects to a manual QR Code payment scanning and proof of payment upload workflow. Customers navigate a multi-step checkout wizard where they agree to terms, scan a venue GCash/Maya QR code, input the last 4 digits of their reference number, and upload a screenshot of their transaction receipt. The image is compressed client-side before being securely uploaded to Supabase Storage. Court staff then inspect the receipt and reference number in an admin lightbox modal and approve the check-in, permanently locking the booking status.

## Context

Automated payment gateways add transaction friction and fees for local sports venues. Venue operators frequently prefer displaying a GCash or Maya QR code image directly, allowing players to pay using their mobile banking apps and upload a payment screenshot.

The system must ensure that uploaded receipt screenshots are compressed, stored securely in Supabase Storage (restricted to images <5MB), court time slots are held immediately upon receipt upload, and venue staff can view the receipt image to approve the reservation.

## Requirements

**User stories**:
- As a customer, I want to scan the venue QR code, enter my reference number, and upload my payment receipt screenshot in a step-by-step wizard so that I can reserve my court.
- As court staff/owner, I want to view the guest's uploaded receipt image and reference number in the admin check-in table so that I can verify payment legitimacy and approve the booking.
- As court staff/owner, I want approved check-in statuses to become locked so that confirmed reservations cannot be altered accidentally.

**Acceptance criteria**:
- **AC-1**: Customer booking confirmation is a multi-step modal (Terms -> Payment). The payment step displays the QR code, an input for "Last 4 Digits of Reference Number", and a file uploader (PNG/JPG/WEBP).
- **AC-2**: Uploaded images are compressed client-side via HTML5 canvas before uploading.
- **AC-3**: Submitting a booking uploads the image to a secured `payment-receipts` bucket (restricted to 5MB images) and creates a `bookings` record with status `PENDING_VERIFICATION` and the `payment_reference_last4`.
- **AC-4**: Interactive availability calendar treats both `PENDING_VERIFICATION` and `APPROVED` bookings as occupied slots to prevent double-bookings.
- **AC-5**: Clicking the `Receipt` button in the Admin Check-In table opens `ReceiptModal` displaying the uploaded receipt image and the last 4 digits.
- **AC-6**: Changing status to `APPROVED` updates PostgreSQL database status and locks the status selector, making it read-only.

## Feature design

**Data model sketch**:
- Table `public.bookings` (Schema Updates):
  - Add `payment_reference_last4`: TEXT
  - Add `receipt_url`: TEXT
  - Update `status` check constraint: `PENDING_VERIFICATION`, `APPROVED`, `REJECTED`, `CANCELLED`
- Storage Bucket: `payment-receipts`
  - RLS Policy: `INSERT` allowed for public, but restricted by `bucket_id = 'payment-receipts'` and file size `< 5242880` bytes (5MB), and mime types `image/png, image/jpeg, image/webp`.

**API / Service surface**:
| Method / Service | Input | Output | Purpose |
|---|---|---|---|
| `compressImage(file)` | `File` | `Blob` | Native canvas utility to compress image before upload |
| `uploadPaymentReceipt(file)` | `File` | `receipt_url: string` | Uploads screenshot to bucket |
| `createBooking(bookingData)` | Guest details, slots, `receipt_url`, `last4` | `Booking` object | Saves booking record with `PENDING_VERIFICATION` |

## Build plan

1. **Database Schema & Storage Setup**: Create migration to add `receipt_url` and `payment_reference_last4` columns, update status constraint, create `payment-receipts` bucket, and apply strict 5MB/Image-only RLS policies.
2. **Image Compression Utility**: Build `src/utils/imageCompression.ts` using native HTML5 Canvas to resize and compress uploaded files.
3. **Booking Service Integration**: Update `src/services/bookingService.ts` to implement `uploadPaymentReceipt` and update `createBooking` payload.
4. **Multi-Step Checkout UI**: Refactor `TermsModal.tsx` into a multi-step wizard (Terms -> Payment/QR) featuring the reference number input and receipt uploader.
5. **Admin Receipt Lightbox Viewer**: Build `ReceiptModal.tsx` to render the uploaded receipt screenshot and last 4 digits in the admin panel.
6. **Admin Status Lock**: Update `CheckInTable.tsx` to include `PENDING_VERIFICATION` and lock the dropdown state for `APPROVED` bookings.
