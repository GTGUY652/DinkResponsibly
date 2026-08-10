# PayMongo Payment Gateway Integration & Transactional Email Receipts

**Workflow:** Beta
**Status:** in-progress

## Feature Scope

Connect the public customer court booking flow to PayMongo Checkout API and Resend Transactional Email API via Supabase Serverless Edge Functions (`paymongo-checkout`, `paymongo-webhook`, `send-email`). Enables direct guest payment (GCash, Maya, Cards in PHP), server-side price calculation, cryptographic HMAC webhook signature verification (`paymongo-signature`), atomic payment confirmation locking, digital receipt links, and automated customer/owner email notifications.

**Done when:** guests selecting a court slot and completing contact details are redirected to PayMongo test checkout, successful payments trigger the signed webhook to write a `CONFIRMED` booking and `payments` row in Supabase, an automated receipt email is dispatched via Resend, and the Admin Check-in table displays the live payment transaction with clickable PayMongo receipt links.

- [x] Design it (spec): [0006](../specs/0006-paymongo-payment-integration.md)
- [ ] Build it: /develop 0006-paymongo-payment-integration
  - [ ] Implement `paymongo-checkout` Edge Function with server-side price validation & PayMongo session creation (AC-1, AC-2)
  - [ ] Implement `paymongo-webhook` Edge Function with HMAC signature verification & ACID payment confirmation (AC-3, AC-4)
  - [ ] Implement `send-email` Edge Function for Resend transactional receipts & owner alerts (AC-5)
  - [ ] Update `AvailabilitySection.tsx` guest modal to trigger PayMongo checkout redirect and handle return success modal (AC-1, AC-6)
  - [ ] Update `CheckInTable.tsx` to surface live payment methods and PayMongo digital receipt links (AC-7)
- [ ] Verify it: /check verify 0006-paymongo-payment-integration
- [ ] Test it: /test 0006-paymongo-payment-integration

Spec pointer: `docs/specs/0006-paymongo-payment-integration.md` · code in `supabase/functions/` and `src/components/`
