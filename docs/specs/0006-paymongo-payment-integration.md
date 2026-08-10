# Spec 0006: PayMongo Payment Gateway Integration & Transactional Emails

**Status:** In Progress
**Build approach:** Tracer Bullet (thin vertical slice end-to-end through Edge Functions, database transactions, and UI)
**Workflow:** Beta

---

## 1. Summary

Implement production-ready online payment authorization for DinkResponsibly using **PayMongo API** (GCash, Maya, Cards in PHP) and transactional email receipts via **Resend API**, powered by Supabase Serverless Edge Functions.

Currently, court reservations are created directly in PostgreSQL without online payment processing (beta mode). This specification details the secure pipeline that replaces direct database writes with a server-side price calculation, PayMongo Hosted Checkout redirect, cryptographically verified Webhook listener (`paymongo-signature`), atomic payment confirmation locking, digital receipt URL tracking, and automated email notifications.

---

## 2. Requirements & Acceptance Criteria

* **AC-1 (Zero Client Price Trust)**: Total booking price is computed exclusively server-side inside `paymongo-checkout` by querying court hourly rates (`weekday_day_rate`, `weekday_night_rate`, `weekend_rate`) from `public.courts` in PostgreSQL.
* **AC-2 (PayMongo Session Creation)**: Submitting guest details returns a valid PayMongo checkout URL supporting GCash, Maya, and Credit/Debit Card payments in PHP.
* **AC-3 (HMAC Webhook Signature Verification)**: Incoming webhooks reject any payload failing `paymongo-signature` verification against `PAYMONGO_WEBHOOK_SECRET` using Web Crypto HMAC SHA-256.
* **AC-4 (Idempotent Payment Confirmation)**: Successful payment webhook events (`checkout_session.payment.paid`) transition booking status to `confirmed` and insert a record into the `payments` table without double processing on retries.
* **AC-5 (Transactional Email Delivery)**: Resend API dispatches an email receipt with reference code `DR-XXXXXX`, reserved court details, amount paid, and clickable link to PayMongo Digital Receipt to the guest email.
* **AC-6 (Abandoned Checkout Protection)**: Unpaid/closed checkout sessions do not block court slots or leave abandoned `confirmed` bookings in the database.
* **AC-7 (Admin Receipt & Check-in Visibility)**: Paid transactions in `CheckInTable.tsx` highlight the payment channel (GCash, Maya, Card) and provide a working clickable link to the official PayMongo digital receipt.

---

## 3. Technical Decision & Architecture

### Options Considered
1. **Direct Frontend PayMongo API Calls**:
   * *Rejected*: Exposes secret API keys (`sk_test_...`) on client browsers and allows users to tamper with calculated total prices in HTTP requests.
2. **Supabase Serverless Edge Functions (Chosen)**:
   * *Selected*: Keeps secret keys (`PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `RESEND_API_KEY`) secure in Deno environment variables. Enables server-side price validation, cryptographic signature verification, and zero cold-start execution.

---

## 4. System Design & Data Flow

```
[ Customer Browser ] ---> 1. POST /paymongo-checkout (Guest details & Court Slot)
                                 |
                                 v
                     [ Edge Function: paymongo-checkout ]
                     - Query public.courts for real hourly rate
                     - Calculate total_price = duration_hours * rate
                     - Call PayMongo API (/v1/checkout_sessions)
                                 |
                                 v
<--- Returns { checkout_url } <---
  |
  +---> Redirects Guest to PayMongo Hosted Payment UI (GCash / Maya / Card)
                                 |
                                 v (Payment Completed)
                     [ PayMongo Payment Gateway ]
                                 |
                                 v 2. POST Webhook (/paymongo-webhook)
                     [ Edge Function: paymongo-webhook ]
                     - Verify paymongo-signature header with HMAC SHA-256
                     - Check idempotency (payment_intent_id processed?)
                     - Update booking status to 'confirmed'
                     - Insert payments row with receipt_url & provider
                                 |
                                 v 3. Invoke send-email
                     [ Edge Function: send-email ]
                     - Call Resend API to send HTML receipt to guest
                     - Notify venue owner email
```

---

## 5. Proposed Component Changes

### Supabase Edge Functions (`supabase/functions/`)

#### 1. `paymongo-checkout/index.ts`
* Replaces template stub with production handler.
* Payload: `{ court_id, booking_date, start_hour, end_hour, guest_name, guest_email, guest_phone }`.
* Queries `public.courts` via Supabase admin client to fetch court rates.
* Computes server-side `total_price = duration_hours * rate`.
* Calls `https://api.paymongo.com/v1/checkout_sessions` using `PAYMONGO_SECRET_KEY`.
* Attaches metadata: `booking_reference`, `guest_email`, `guest_name`, `court_id`, `start_hour`, `end_hour`.
* Returns `{ checkout_url, session_id }`.

#### 2. `paymongo-webhook/index.ts`
* Replaces template stub with secure HMAC webhook listener.
* Extracts `paymongo-signature` header (`t=...,te=...,li=...`).
* Verifies signature against `PAYMONGO_WEBHOOK_SECRET` using Web Crypto API.
* Handles `checkout_session.payment.paid` event.
* Executes idempotent database transaction:
  - Updates `bookings` status to `confirmed`.
  - Inserts `payments` row (`booking_id`, `payment_provider` = 'paymongo', `payment_intent_id`, `receipt_url`, `amount`, `status` = 'PAID').
* Invokes `send-email` function.

#### 3. `send-email/index.ts`
* Sends email using Resend API (`https://api.resend.com/emails`) via `RESEND_API_KEY`.
* Supports `booking_receipt` template with reference code, court schedule, amount paid, and clickable link to PayMongo Digital Receipt.

---

### Client Application Layer (`src/`)

#### 1. `src/services/bookingService.ts`
* Adds `createCheckoutSession(payload)` helper to invoke `paymongo-checkout` edge function via `@supabase/supabase-js`.
* Adds `fetchBookingByCode(code)` helper to retrieve confirmed booking details for the return receipt view.

#### 2. `src/components/customer/AvailabilitySection.tsx`
* Updates checkout form submission:
  - Invokes `createCheckoutSession()`.
  - Redirects guest browser to `checkout_url`.
* Handles return redirect (`?booking_success=DR-XXXXXX`):
  - Displays instant confirmation modal displaying Reference Code, reserved details, and PayMongo receipt link.

#### 3. `src/components/admin/CheckInTable.tsx`
* Displays payment method (GCash, Maya, Card) and renders clickable link to official PayMongo Digital Receipt (`receipt_url`).

---

## 6. Build Plan & Milestones

- [x] Design it (spec 0006): `docs/specs/0006-paymongo-payment-integration.md`
- [ ] Build it: `/develop 0006-paymongo-payment-integration`
  - [ ] Task 1: Update `paymongo-checkout` Edge Function with server-side price validation & PayMongo session creation (satisfies AC-1, AC-2)
  - [ ] Task 2: Update `paymongo-webhook` Edge Function with HMAC signature verification & ACID payment confirmation (satisfies AC-3, AC-4)
  - [ ] Task 3: Update `send-email` Edge Function for Resend transactional receipts & owner alerts (satisfies AC-5)
  - [ ] Task 4: Integrate `createCheckoutSession()` in `bookingService.ts` and update `AvailabilitySection.tsx` guest modal (satisfies AC-1, AC-6)
  - [ ] Task 5: Update `CheckInTable.tsx` to surface payment channel and PayMongo digital receipt link (satisfies AC-7)
- [ ] Verify it: `/check verify 0006-paymongo-payment-integration`
- [ ] Test it: `/test 0006-paymongo-payment-integration`

---

## 7. Consequences & Edge Cases

* **Webhook Retries**: PayMongo retries webhooks on non-200 responses. Idempotency checks on `payment_intent_id` prevent duplicate database insertions or multiple email dispatches.
* **Closed / Abandoned Checkout**: If a guest closes the PayMongo checkout tab without paying, no webhook fires and no `confirmed` booking is saved in PostgreSQL. Court slots remain 100% available.
* **Sandbox to Production Launch**: Transitioning to live production requires zero code changes; simply update API keys in environment variables (`sk_live_...` and `pk_live_...`).

---

## 8. Verification Plan

### Automated Unit Tests
* Run `npm test` to verify helper methods in `bookingService.ts`.

### Manual & Sandbox Integration Testing
1. Test guest checkout flow using PayMongo Test Sandbox (`sk_test_...`).
2. Simulate GCash payment success in PayMongo Test Sandbox interface.
3. Verify webhook execution, database update to `confirmed`, and `payments` row creation.
4. Verify email receipt dispatch via Resend.
5. Confirm admin check-in table displays paid reservation with working receipt link.
