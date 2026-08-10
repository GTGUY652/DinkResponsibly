# Supabase Edge Functions

## Overview

Supabase Serverless Edge Functions running on the Deno TypeScript runtime. Handles secure backend operations including court availability calculations, PayMongo checkout session creation, PayMongo webhook cryptographic signature verification, transactional email dispatch via Resend, and Gemini AI queries.

## Edge Function Development Reminder

> [!IMPORTANT]
> **When to use Edge Functions vs Supabase Client SDK:**
> - **Direct Database Operations (Phase 1)**: Handled directly in `src/services/bookingService.ts` using `@supabase/supabase-js` for fast schedule checks and booking rows.
> - **Edge Functions (`supabase/functions/`)**: Strictly required for Phase 2 & 3 features that involve secret keys or external webhook listeners:
>   1. `paymongo-checkout`: Server-side price calculation and PayMongo payment intent creation (keeps `sk_test_...` key secret).
>   2. `paymongo-webhook`: Receiving GCash/Maya payment notifications and verifying `paymongo-signature` HMAC headers.
>   3. `send-email`: Dispatching transactional email receipts via Resend API (`RESEND_API_KEY`).
>   4. `gemini-advisor`: Running Google Gemini AI queries for sales reports and chatbot (`GEMINI_API_KEY`).

## Key files

| File | Owns |
|---|---|
| `_shared/cors.ts` | Cross Origin Resource Sharing headers for API endpoints |
| `availability/index.ts` | Schedule grid availability and rate calculation logic (optional fallback) |
| `paymongo-checkout/index.ts` | PayMongo payment intent creation and server side price calculation |
| `paymongo-webhook/index.ts` | Cryptographic HMAC signature verification and payment confirmation |
| `send-email/index.ts` | Email receipt dispatch using Resend API |
| `gemini-advisor/index.ts` | Google Gemini API integration for sales reports and chatbot queries |

## Commands

```bash
# Serve edge functions locally
supabase functions serve

# Deploy an edge function
supabase functions deploy <function-name>
```

## Conventions

- Every function runs on Deno runtime inside `supabase/functions/`.
- Never trust frontend price calculations. Calculate totals server side by querying court hourly rates.
- Verify `paymongo-signature` header against `PAYMONGO_WEBHOOK_SECRET` on all incoming webhook requests.
- All CORS requests must handle OPTIONS preflight calls using `_shared/cors.ts`.
- Wrap payment updates and booking confirmations in PostgreSQL ACID database transactions.

## Gotchas

- Deno imports require explicit URL or file extensions.
- Secret environment variables (`PAYMONGO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `GEMINI_API_KEY`) must be set via Supabase secrets CLI or dashboard.
