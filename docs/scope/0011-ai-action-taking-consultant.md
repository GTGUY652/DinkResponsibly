# Scope: DinkResponsibly

A straightforward web-based Pickleball Court Booking System.

**Build approach:** Tracer Bullet (vertical end to end slices, thin but complete through every layer).
**Workflow:** Beta (check verify, then test). The project's default rigor tier; a feature's own tier tag (e.g. `Â· GA`) overrides it.

_You are in charge. Every box below is a **suggestion**, not a gate: run any, skip any, and mark a feature `done` when you decide it is. The workflow records what you actually did (including "skipped"), it never requires a step. The one thing it asks is that a load bearing decision be written down (a spec), not that any check be run._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Customer Portal | Existing | existing |
| 2 | Admin Dashboard | Existing | existing |
| 3 | AI Action-Taking Consultant | Slice 1 | shipped |
| 4 | Smart Schedule Manager | Slice 2 | shipped |
| 5 | Actionable Zero-Cost Heatmap | Slice 3 | shipped |

## Existing

### 1. Customer Portal Â· existing
Public Guest Reservation Homepage, QR Payment & Receipt Upload, About Us, Contact, and Ticket Submission. code in `src/components/customer/` and `src/pages/CustomerLanding.tsx`

### 2. Admin Dashboard Â· existing
Owner & Staff Protected Dashboard, Check-In Verification Table, Rate Controller, Receipt Lightbox. code in `src/components/admin/` and `src/pages/AdminLogin.tsx`

## Slice 1: AI Action-Taking Consultant

### 3. AI Action-Taking Consultant Â· shipped
A reactive, action-oriented business consultant inside the admin dashboard powered by Gemini. It fetches real-time booking data to visualize heatmaps and gives the admin 1-click execution buttons for operational actions (update rates, disable staff, block schedules).
**Done when:** Admin can open a chat widget, ask a question about sales or schedule, view rendered charts in the chat, and click buttons to execute operational changes safely.
- [x] Design it (spec): [0011](../specs/0011-ai-action-taking-consultant.md)
- [x] Build it: /develop AI Action-Taking Consultant
  - UI Foundation: Floating chat widget and ephemeral state (AC-1, AC-2, AC-3)
  - Edge Function & Wiring: Proxy setup, message, and error handling (AC-4, AC-5, AC-8)
  - Action Execution: Render confirm button and natively execute mutations via bookingService.ts (AC-6, AC-7, AC-9)
- [x] Verify it: /check verify AI Action-Taking Consultant
- [x] Test it: /test AI Action-Taking Consultant

## Slice 2: Smart Schedule Manager

### 4. Smart Schedule Manager Â· shipped
An upgrade to the AI consultant that acts as a proactive safety net. It intercepts block intents, queries future bookings for conflicts, calculates lost revenue, and renders a visual confirmation card before executing.
**Done when:** Admin can ask to block a specific multi-day date range or exact hours, AI fetches future bookings, warns about lost revenue if conflicts exist, and admin visually confirms the block on an interactive UI card.
- [x] Design it (spec): [0012](../specs/0012-smart-schedule-manager.md)
- [x] Build it: /develop Smart Schedule Manager
  - AI Intent: Update gemini-advisor to return prepare_block (AC-1)
  - DB Helpers: Add fetchBookingsForDateRange and flagBookingsForRefund (AC-2, AC-5)
  - UI Card: Intercept prepare_block, show warning and visual confirmation (AC-3, AC-4)
  - Execute: Wire confirm button to execute block and refund flag (AC-5, AC-6)
- [x] Verify it: /check verify Smart Schedule Manager
- [x] Test it: /test Smart Schedule Manager


## Slice 3: Actionable Heatmap

### 5. Actionable Zero-Cost Heatmap · shipped
A rich interactive heatmap widget rendered directly inside the AI chat stream to visualize peak operating hours and revenue trends. Triggered by natural language (e.g., "show me the heatmap for September").
**Done when:** Admin can ask for a heatmap for a specific time range. The chat UI renders a mobile-friendly grid (defaulting to Utilization/Peak Hours) without incurring AI token costs for data processing. The UI includes native toggles for Revenue vs Utilization, and clicking a cold cell drafts a quick action prompt.
- [x] Design it (spec): /architect Actionable Zero-Cost Heatmap
- [x] Build it: /develop Actionable Zero-Cost Heatmap
- [x] Verify it: /check verify Actionable Zero-Cost Heatmap
- [x] Test it: /test Actionable Zero-Cost Heatmap

