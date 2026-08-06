# Supabase Edge Functions

## Overview

Supabase Serverless Edge Functions running on the Deno TypeScript runtime. Handles secure backend operations including court availability calculations, PayMongo checkout session creation, PayMongo webhook cryptographic signature verification, transactional email dispatch via Resend, and Gemini AI queries.

## Key files

| File | Owns |
|---|---|
| `_shared/cors.ts` | Cross Origin Resource Sharing headers for API endpoints |
| `availability/index.ts` | Schedule grid availability and rate calculation logic |
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

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
