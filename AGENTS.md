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

- Clean Architecture pattern: code is organized in four layers (domain for entities and value objects, application for use cases, infrastructure for database and APIs, presentation for UI and controllers).
- Dependency rule: outer layers depend on inner layers, never the reverse. Domain has zero external imports.
- Use cases are thin orchestrators. They call domain logic and infrastructure interfaces, never implement business rules themselves.
- Infrastructure implements interfaces defined in the domain or application layer (dependency inversion).
- No framework code (React, Supabase, etc.) appears inside domain or application layers.
- Entities contain business rules and enforce their own invariants. They are plain objects with no decorators.
- All cross boundary communication uses plain objects or DTOs. No domain entities leak into presentation layer.
- Tests: domain and application layers are unit tested with no mocks of infrastructure. Infrastructure is integration tested against real systems.
- Booking business rules: 4 Courts managed simultaneously (Court A, Court B, Court C, Court D). Bookings enforce strict 1-hour slots. Dynamic pricing applies (Weekdays 6:00 AM to 4:00 PM at 400 PHP per hour, Weekdays 5:00 PM to 2:00 AM at 500 PHP per hour, Weekends 6:00 AM to 2:00 AM flat rate 500 PHP per hour). Direct guest checkout without requiring customer accounts.
- Edge Functions vs Client SDK rule: Direct DB operations use `src/services/bookingService.ts` via `@supabase/supabase-js`. Edge Functions in `supabase/functions/` are reserved for PayMongo payments (`paymongo-checkout`, `paymongo-webhook`), Resend emails (`send-email`), and Gemini AI (`gemini-advisor`).

## Context files

- [src/components/admin/AGENTS.md](src/components/admin/AGENTS.md): Admin Dashboard presentation components for check-in, dynamic rates, support tickets, staff management, and revenue overview
- [src/components/customer/AGENTS.md](src/components/customer/AGENTS.md): Presentational components for customer landing, interactive court booking availability, about us, contact form, and floating support ticket modal
- [supabase/functions/AGENTS.md](supabase/functions/AGENTS.md): Supabase serverless edge functions for availability, PayMongo payments, Resend emails, and Gemini AI

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
