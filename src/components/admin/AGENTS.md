# Admin Dashboard Components

## Overview

Presentation layer components powering the DinkResponsibly Admin Dashboard. Provides real-time venue check-in verification, dynamic court pricing & operational status toggles, customer support ticket management with Resend email replies, and staff user management.

## Key files

| File | Owns |
|---|---|
| `CheckInTable.tsx` | Paid court reservation table with search, reference code filter, and PayMongo receipt links |
| `RateController.tsx` | Owner-exclusive court hourly rate controller and active court toggle state |
| `TicketPortal.tsx` | Customer support ticket browser and direct email response modal using Resend edge function |
| `StaffManager.tsx` | Owner-exclusive staff account creation and deactivation interface |

## Conventions

- Restrict sensitive UI controls (RateController, StaffManager) to users with `OWNER` role (`role === 'OWNER'`).
- Style components using dedicated CSS files (`CheckInTable.css`, `RateController.css`, etc.) paired with each component.
- Handle transactional email sending by invoking the `send-email` Supabase Edge Function directly.
- Use Supabase Realtime subscriptions to listen for live booking and rate update broadcasts.

## Gotchas

- Staff accounts cannot execute rate modifications; UI elements must be hidden or disabled for `STAFF` role.
- PayMongo receipt links should open in a new browser tab (`target="_blank" rel="noopener noreferrer"`).

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
