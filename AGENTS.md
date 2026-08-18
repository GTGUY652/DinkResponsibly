# DinkResponsibly

## Stack

- **Language / Runtime**: TypeScript, Node.js
- **Framework**: React 19, Vite 8, Supabase Edge Functions (Deno)
- **Key dependencies**: `@supabase/supabase-js`, `lucide-react`, React 19
- **Package manager**: npm

## Build approach

- **Tracer Bullet**: vertical end to end slices, thin but complete through every layer

## Commands

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build application
npm run build

# Preview build
npm run preview

# Run unit test suite
npm test

# Lint code
npm run lint
```

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Rules

- **Standard React Architecture**: Code is organized into standard feature folders (`src/components`, `src/services`, `src/pages`). Do NOT use Clean Architecture (domain/infrastructure/presentation) as it is not the convention of this codebase.
- **Security Boundaries**: Never trust client-side validation for critical operations. 
  - **Overlaps**: Double booking checks MUST be handled via Postgres atomic constraints (row-level locks), NOT client-side queries.
  - **RLS**: Supabase Row Level Security (RLS) must explicitly check user roles (e.g., `role IN ('OWNER', 'STAFF')`). Never use `USING (true)` for `UPDATE` or `DELETE` operations.
  - **Storage**: Any file uploads (e.g., `payment-receipts` bucket) must have RLS policies restricting file types (.png/.jpg) and preventing public deletion.
  - **Input Validation**: Use Zod schema validation at the edge function boundaries before passing data to Resend or Gemini.
- Booking business rules: 4 Courts managed simultaneously (Court A, Court B, Court C, Court D). Bookings enforce strict 1-hour slots. Dynamic pricing applies (Weekdays 6:00 AM to 4:00 PM at 400 PHP per hour, Weekdays 5:00 PM to 2:00 AM at 500 PHP per hour, Weekends 6:00 AM to 2:00 AM flat rate 500 PHP per hour). Direct guest checkout without requiring customer accounts.
- Edge Functions vs Client SDK rule: Direct DB operations, slot availability, and receipt image uploads use `src/services/bookingService.ts` via `@supabase/supabase-js`. Edge Functions in `supabase/functions/` are reserved for Resend emails (`send-email`) and Gemini AI (`gemini-advisor`).

## Context files

- [src/components/admin/AGENTS.md](src/components/admin/AGENTS.md): Admin Dashboard presentation components for check-in, receipt image lightbox viewing, dynamic rates, support tickets, staff management, and revenue overview
- [src/components/customer/AGENTS.md](src/components/customer/AGENTS.md): Presentational components for customer landing, interactive court booking availability, QR code payment modal with receipt screenshot upload, about us, contact form, and floating support ticket modal
- [supabase/functions/AGENTS.md](supabase/functions/AGENTS.md): Supabase serverless edge functions for Resend emails and Gemini AI
