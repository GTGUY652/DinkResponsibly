# Supabase Edge Functions

## Overview

Supabase Serverless Edge Functions running on the Deno TypeScript runtime. Handles secure backend operations including transactional email dispatch via Resend and Gemini AI queries.

## Edge Function Development Reminder

> [!IMPORTANT]
> **When to use Edge Functions vs Supabase Client SDK:**
> - **Direct Database & Storage Operations**: Handled directly in `src/services/bookingService.ts` using `@supabase/supabase-js` for schedule checks, booking creation, receipt screenshot uploads (`payment-receipts` bucket), and admin check-in updates.
> - **Edge Functions (`supabase/functions/`)**: Reserved for features involving secret keys or external services:
>   1. `send-email`: Dispatching transactional email receipts via Resend API (`RESEND_API_KEY`).
>   2. `gemini-advisor`: Running Google Gemini AI queries for sales reports and chatbot (`GEMINI_API_KEY`).

## Key files

| File | Owns |
|---|---|
| `_shared/cors.ts` | Cross Origin Resource Sharing headers for API endpoints |
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
- All CORS requests must handle OPTIONS preflight calls using `_shared/cors.ts`.
- **Security**: Never trust client inputs directly in Edge Functions. Validate all data using a schema validation library like `zod` before processing.

## Gotchas

- Deno imports require explicit URL or file extensions.
- Secret environment variables (`RESEND_API_KEY`, `GEMINI_API_KEY`) must be set via Supabase secrets CLI or dashboard. (Note: The project no longer uses PayMongo.)
- Remember to properly handle JSON parsing errors defensively to prevent edge function crashes.
