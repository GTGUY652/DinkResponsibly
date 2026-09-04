# 0012. Smart Schedule Manager

**Date**: 2026-09-02
**Status**: Implemented

## Summary

This upgrade turns the AI consultant into a proactive schedule manager that intercepts block requests, checks for booking conflicts, and warns the admin of potential lost revenue. Instead of executing blindly, it renders an interactive visual card for the admin to confirm the exact bounds and dates. This ensures accurate multi-day blocks and temporary operating hours while preventing accidental overrides of paying customers.

## Context

The current AI Action-Taking Consultant executes actions immediately based on the admin's prompt. When asked to block a specific date range (e.g., September 6-10) or specific hours, the AI occasionally misinterprets the bounds (e.g., blocking the wrong court or the entire day). More critically, it does not check if customers are already booked during that time, leading to accidental revenue loss. We need a way for the AI to query future bookings, calculate the financial impact of a block, and provide a visual confirmation safety net before modifying the database. Since the AI currently only knows the context explicitly fed to it by the React client on each message, we must introduce a client-side interception step to fetch the required future data on demand.

## Requirements

**User stories**:
- As an admin, I want to block a specific court for multiple days so that I can schedule long-term maintenance.
- As an admin, I want to be warned if my proposed block overlaps with existing bookings so that I can decide whether to proceed or find staff cover instead.
- As an admin, I want to visually confirm the exact time bounds of a block on a UI card before it executes so that I do not accidentally close the wrong hours.

**Acceptance criteria**:
- **AC-1**: The AI understands multi-day blocks and "only open from X to Y" operating hour overrides, returning a structured prepare_block intent.
- **AC-2**: The React frontend intercepts the block intent, queries ookings for the specified future dates, and calculates the 	otal_price of overlapping active bookings.
- **AC-3**: If conflicts exist, the UI displays a warning message with the calculated lost revenue amount.
- **AC-4**: The UI renders an interactive Confirmation Card showing the target courts, start/end dates, time sliders, and a reason tag (e.g., Maintenance).
- **AC-5**: If the admin proceeds with the block despite conflicts, the existing overlapping bookings are updated to status: 'NEEDS_REFUND'.
- **AC-6**: The block is executed natively via ookingService.ts.

## Options considered

### Option 1: AI Multi-Turn Tool Calling (Backend)

The Edge Function orchestrates a multi-turn conversation, calling a check_bookings tool, receiving the result, and then deciding whether to warn the user.

**Pros**:
- Keeps business logic in the AI prompt.

**Cons**:
- Increases latency significantly due to multiple Gemini API round-trips.
- Costs more API tokens.

### Option 2: Client-Side Intent Interception (Recommended)

The AI outputs a structured block intent. The React client intercepts this intent, fetches the booking data, calculates the revenue impact natively, and renders the warning/confirmation UI directly.

**Pros**:
- Zero additional AI API calls (keeps costs strictly on the free tier).
- Instant UI feedback and native React slider controls for the visual confirmation.
- Honors the existing architectural boundary where React executes database queries.

**Cons**:
- Requires adding calculation logic to the frontend component.

## Decision

**Chosen option**: Option 2: Client-Side Intent Interception

The AI will output a structured intent containing the proposed date range and bounds. The React frontend will intercept this, query the database natively to calculate the revenue impact, and render a visual confirmation card. 

## Rationale

This approach strictly adheres to the project's zero-cost API constraint by avoiding multi-turn AI polling. It leverages the existing pattern of using the Edge Function solely as an AI proxy, while keeping all database reads, business logic (revenue calculation), and execution safely in the React client where Postgres Row Level Security (RLS) is natively enforced.

## Feature design

**Data model sketch**:
- No new tables.
- Extend BookingRecord status enum in TypeScript to include 'NEEDS_REFUND'.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| supabase.functions.invoke('gemini-advisor') | POST | messages, context | suggested_action: { type: 'prepare_block', payload: { start_date, end_date, courts, start_hour, end_hour } } | bearer | 500 (AI failed) |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Calculate Lost Revenue | Total price of overlapping bookings | 	otal_price column of ookings table for the specified date range |
| Confirmation Card | Start date, end date, hours | Parsed from the AI's payload |
| Execute Block | status: 'NEEDS_REFUND' | Hardcoded application logic applied to overlapping bookings upon block execution |

**Key invariants**:
- A block cannot be executed without the admin clicking the visual [Confirm Action] button.
- The revenue calculation must only sum bookings where status is not cancelled or REJECTED.

**Security model**:
- Only users with ole IN ('OWNER', 'STAFF') can access the AI consultant and execute blocks, enforced via existing RLS on the ookings table.

**Critical test scenarios**:
- Happy path: Admin requests a 3-day block on an empty schedule, AI returns intent, React shows $0 impact, admin confirms, block is saved, verifies **AC-1, AC-4, AC-6**.
- Failure case: Admin requests a block overlapping with $500 of bookings, React shows warning, admin forces block, overlapping bookings are flagged NEEDS_REFUND, verifies **AC-2, AC-3, AC-5**.
- Auth/permission: Customer attempts to trigger block intent, RLS denies execution, verifies **AC-6**.

## Build plan

1. Update gemini-advisor Edge Function system prompt to output a prepare_block action instead of executing a block blindly, satisfies **AC-1**.
2. Add a etchBookingsForDateRange helper to ookingService.ts to query active bookings across multiple days, satisfies **AC-2**.
3. Add a lagBookingsForRefund helper to ookingService.ts to update overlapping bookings to NEEDS_REFUND, satisfies **AC-5**.
4. Update AiConsultantWidget.tsx to intercept prepare_block, fetch overlapping bookings, and calculate the lost revenue sum, satisfies **AC-2, AC-3**.
5. Build the Interactive Block Card component inside AiConsultantWidget.tsx with date/time sliders and the warning message, satisfies **AC-4**.
6. Wire the card's confirm button to execute the block and trigger the refund flag natively via ookingService.ts, satisfies **AC-5, AC-6**.

## Consequences

**Positive**:
- Admins will no longer accidentally overwrite revenue-generating bookings.
- Complex multi-day blocks are visually verified, eliminating AI hallucination risks.

**Negative / tradeoffs**:
- The React component AiConsultantWidget.tsx will grow in complexity as it handles date math and overlapping booking state.

**Neutral**:
- Staff will need a new UI view in the future to process the bookings flagged as NEEDS_REFUND.

## Follow-up

- [ ] Design a staff dashboard view to manage and process refunds for bookings flagged as NEEDS_REFUND.
