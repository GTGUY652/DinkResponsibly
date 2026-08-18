# Admin Dashboard Components

## Overview

Presentation layer components powering the DinkResponsibly Admin Dashboard. Provides real-time venue check-in verification, dynamic court pricing & operational status toggles, customer support ticket management with Resend email replies, and staff user management.

## Key files

| File | Owns |
|---|---|
| `CheckInTable.tsx` | Paid court reservation table with search, reference code filter, and receipt screenshot lightbox links |
| `RateController.tsx` | Owner-exclusive court hourly rate controller and active court toggle state |
| `TicketPortal.tsx` | Customer support ticket browser and direct email response modal using Resend edge function |
| `StaffManager.tsx` | Owner-exclusive staff account creation and deactivation interface |
| `RevenueOverview.tsx` | Real-time financial dashboard with KPI cards, unit economics, Recharts trend graph, and CSV export |

## Conventions

- Restrict sensitive UI controls (RateController, StaffManager) to users with `OWNER` role (`role === 'OWNER'`).
- Style components using dedicated CSS files (`CheckInTable.css`, `RateController.css`, etc.) paired with each component.
- Handle transactional email sending by invoking the `send-email` Supabase Edge Function directly.
- Use Supabase Realtime subscriptions to listen for live booking and rate update broadcasts.

## Gotchas

- Staff accounts cannot execute rate modifications; UI elements must be hidden or disabled for `STAFF` role.
- Receipt screenshot images are stored in the Supabase `payment-receipts` bucket and should open in a lightbox or new tab securely.
