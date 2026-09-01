# Scope: DinkResponsibly

A straightforward web-based Pickleball Court Booking System.

**Build approach:** Tracer Bullet (vertical end to end slices, thin but complete through every layer).
**Workflow:** Beta (check verify, then test). The project's default rigor tier; a feature's own tier tag (e.g. `· GA`) overrides it.

_You are in charge. Every box below is a **suggestion**, not a gate: run any, skip any, and mark a feature `done` when you decide it is. The workflow records what you actually did (including "skipped"), it never requires a step. The one thing it asks is that a load bearing decision be written down (a spec), not that any check be run._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Customer Portal | Existing | existing |
| 2 | Admin Dashboard | Existing | existing |
| 3 | AI Action-Taking Consultant | Slice 1 | in-progress |

## Existing

### 1. Customer Portal · existing
Public Guest Reservation Homepage, QR Payment & Receipt Upload, About Us, Contact, and Ticket Submission. code in `src/components/customer/` and `src/pages/CustomerLanding.tsx`

### 2. Admin Dashboard · existing
Owner & Staff Protected Dashboard, Check-In Verification Table, Rate Controller, Receipt Lightbox. code in `src/components/admin/` and `src/pages/AdminLogin.tsx`

## Slice 1: AI Action-Taking Consultant

### 3. AI Action-Taking Consultant · in-progress
A reactive, action-oriented business consultant inside the admin dashboard powered by Gemini. It fetches real-time booking data to visualize heatmaps and gives the admin 1-click execution buttons for operational actions (update rates, disable staff, block schedules).
**Done when:** Admin can open a chat widget, ask a question about sales or schedule, view rendered charts in the chat, and click buttons to execute operational changes safely.
- [x] Design it (spec): [0011](../specs/0011-ai-action-taking-consultant.md)
- [ ] Build it: /develop AI Action-Taking Consultant
  - UI Foundation: Floating chat widget and ephemeral state (AC-1, AC-2, AC-3)
  - Edge Function & Wiring: Proxy setup, message, and error handling (AC-4, AC-5, AC-8)
  - Action Execution: Render confirm button and natively execute mutations via bookingService.ts (AC-6, AC-7, AC-9)
- [ ] Verify it: /check verify AI Action-Taking Consultant
- [ ] Test it: /test AI Action-Taking Consultant

