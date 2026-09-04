# 0013. Actionable Zero-Cost Heatmap

**Date**: 2026-09-03
**Status**: Implemented

## Summary

This upgrade adds a rich, interactive heatmap widget to the AI Consultant's chat interface. Admins can request a heatmap for a specific timeframe (e.g., "show me the heatmap for September") using natural language. The AI extracts the date range and the React frontend natively fetches and renders the visual grid, avoiding expensive token costs while providing actionable, mobile-friendly insights into peak utilization and revenue.

## Context

Venue owners need to visualize booking trends to identify their true peak hours and dead zones, enabling smarter dynamic pricing and staff scheduling decisions. While the AI consultant can answer questions, feeding thousands of historical or future booking records directly into the Gemini prompt for analysis would violate the project's zero-cost API constraint. We need a way to provide rich visual data analysis (a heatmap) that feels seamless within the chat but pushes the heavy data processing and rendering entirely to the client side. Furthermore, this heatmap needs to be actionable rather than just a passive report, allowing admins to instantly act on the insights they discover.

## Requirements

**User stories**:
- As an admin checking from my phone, I want to see a visual heatmap of bookings so I can instantly identify peak hours and dead zones.
- As an admin, I want to toggle between seeing court utilization (default) and total revenue so I can compare how dynamic pricing affects income.
- As an admin, I want to click on a dead zone in the heatmap and instantly create a promo rate or block the time, making the insight immediately actionable.

**Acceptance criteria**:
- **AC-1**: The AI correctly parses a natural language request for a heatmap (e.g., "this month", "next week") and returns a structured show_heatmap intent with startDate and endDate.
- **AC-2**: The React frontend intercepts the show_heatmap intent and securely fetches the relevant booking records natively.
- **AC-3**: The UI renders a mobile-friendly grid mapping Days to Hours, defaulting to a "Utilization" metric where the highest number of bookings is the darkest color.
- **AC-4**: The widget provides native React toggles to switch the metric from "Utilization" to "Revenue" without triggering a new AI API call.
- **AC-5**: Clicking an empty or "cold" cell pre-fills the chat input with an actionable draft (e.g., "Create a promo rate for Thursday 2 PM").

## Options considered

### Option 1: AI-Generated SVG or Chart Data

The AI reads the raw booking data and outputs an SVG string or a pre-calculated JSON array of grid coordinates.

**Pros**:
- Keeps the chart generation logic inside the LLM prompt.

**Cons**:
- Violates the free-tier cost constraint by requiring the entire booking dataset to be sent to the AI.
- Extremely high token usage and high latency.

### Option 2: Client-Side Intent and Native Rendering (Recommended)

The AI only parses the date intent. The React frontend fetches the data, calculates the density/revenue per cell, and renders the visual grid.

**Pros**:
- Zero additional API token cost.
- Instant, interactive toggling (Revenue vs. Utilization) since the data is already in the client.
- Easy to make interactive/clickable.

**Cons**:
- Moves data grouping and visualization logic into the React component layer.

## Decision

**Chosen option**: Option 2: Client-Side Intent and Native Rendering

The AI will output a show_heatmap intent with a target date range. The React frontend will intercept this intent, fetch the booking data directly from Supabase, process it into a grid, and render an interactive, actionable heatmap component.

## Rationale

This approach strictly honors the zero-cost architecture by offloading all data processing and rendering to the client. By making the heatmap native to React, we unlock interactive features—like metric toggles and click-to-act behaviors—that would be impossible, slow, or expensive to handle via a round-trip to the AI.

## Feature design

**Data model sketch**:
- No new tables or columns.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| supabase.functions.invoke('gemini-advisor') | POST | messages, context | suggested_action: { type: 'show_heatmap', payload: { start_date, end_date } } | bearer | 500 (AI failed) |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Cell Color (Utilization) | Count of overlapping bookings for that hour | Grouped natively in React from fetched ookings |
| Cell Color (Revenue) | Sum of 	otal_price for that hour | Grouped natively in React from fetched ookings |
| Click Action Draft | Pre-filled prompt string | Constructed from the cell's underlying Date/Time |

**Key invariants**:
- The heatmap fetching must respect the exact date range parsed by the AI.
- Cell clicks must only pre-fill the chat input, not execute the action immediately, allowing the admin to review/edit the prompt.

**Security model**:
- Only authenticated users with ole IN ('OWNER', 'STAFF') can trigger the heatmap, enforced via existing ookings RLS policies.

**Critical test scenarios**:
- Happy path: Admin asks for September heatmap, AI returns intent, React fetches data and draws utilization grid, verifies **AC-1, AC-2, AC-3**.
- Native Toggle: Admin switches to Revenue tab, grid updates instantly without network request, verifies **AC-4**.
- Actionability: Admin clicks empty Thursday 2PM cell, chat input populates with "Create promo rate for...", verifies **AC-5**.

## Build plan

1. Update gemini-advisor Edge Function to recognize heatmap requests and return a show_heatmap action with date bounds, satisfies **AC-1**.
2. Create the data processing utility in React to group raw bookings into a [Day][Hour] 2D array for both Utilization and Revenue metrics, satisfies **AC-2**.
3. Build the ActionableHeatmap React component (mobile-responsive grid) handling the color intensity mapping, satisfies **AC-3**.
4. Add native UI toggles to ActionableHeatmap for switching metrics without re-fetching, satisfies **AC-4**.
5. Implement onClick handlers on the heatmap cells that dispatch a pre-filled message back up to the parent chat widget's input state, satisfies **AC-5**.
6. Wire the show_heatmap action intent interception in AiConsultantWidget.tsx to render the new component.

## Consequences

**Positive**:
- Admins gain a powerful visual reporting tool directly inside the chat.
- Zero-cost architecture is maintained.
- Drives immediate operational actions (promos, blocks) directly from insights.

**Negative / tradeoffs**:
- Complex 2D array manipulation and responsive grid styling required on the frontend.
- Heavy localized data fetching if the date range requested spans multiple months or years (we may need to limit the bounds in the AI prompt).

## Follow-up

- [ ] Add a prompt instruction to the AI to politely enforce a maximum date range (e.g., 3 months) if the admin asks for a heatmap covering an entire year, to prevent massive client-side data fetches.
