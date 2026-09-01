# 0011. AI Action-Taking Consultant

**Date**: 2026-09-01
**Status**: Proposed

## Summary

This spec defines a floating AI chat widget for the Admin Dashboard that provides business insights and executes operational tasks. It uses Gemini Flash via a Supabase Edge Function to keep API costs near zero and avoids database storage by keeping chat history ephemeral (browser-only). The Edge function acts strictly as an AI proxy. When the AI recommends a change like updating a court rate or blocking a schedule, it returns a structured intent. The UI renders a secure 1-click confirm button, and the React client executes the database mutation natively using the existing ookingService.ts, fully honoring the project's Row Level Security (RLS) rules.

## Context

The system currently has a comprehensive Admin Dashboard, but finding specific insights (like revenue heatmaps) or executing operational changes (like disabling a staff member or updating rates) requires navigating through multiple settings pages. A reactive, AI-powered consultant embedded directly in the dashboard reduces this friction. Because the project operates on the Gemini free tier, the architecture must avoid expensive, continuous background processing. It must also ensure that sensitive actions are executed securely. The project rules strictly dictate that Edge Functions cannot bypass RLS to mutate the database directly; all data fetching and mutations must happen via the client SDK.

## Requirements

**User stories**:
- As an Admin/Staff, I want to open a chat widget in the dashboard so that I can ask for business insights.
- As an Admin/Staff, I want to click a button in the chat to execute an action (like updating a rate) so that I don't have to navigate to separate settings pages.

**Acceptance criteria**:
- **AC-1**: Admin/Staff can toggle a floating chat widget on the bottom right of the Admin Dashboard.
- **AC-2**: The chat widget styling matches the existing Admin Dashboard UI / Tailwind conventions.
- **AC-3**: Chat history is ephemeral; it clears when the browser is refreshed. The React client maintains the conversational array.
- **AC-4**: A prompt is sent securely to a Supabase Edge Function (/gemini-advisor), which verifies the user has the OWNER or STAFF role before processing.
- **AC-5**: The AI can return structured data for specific actions (update rate, disable staff, block schedule) alongside text advice.
- **AC-6**: When an action is proposed, the UI renders a 1-click [Confirm Action] button inside the chat bubble.
- **AC-7**: Database mutations ONLY execute after the Admin clicks the confirm button, triggered securely by the React client SDK (ookingService.ts) enforcing standard RLS.
- **AC-8**: If the Gemini API fails or returns invalid data, the UI falls back gracefully with an error message ("The consultant is currently unavailable").
- **AC-9**: If a schedule block action fails due to concurrency (a customer books the slot right before the Admin clicks confirm), the UI shows a "Slot already taken" toast gracefully.

## Options considered

### Option 1: Client-Side SDK Execution (Chosen)
The Edge Function strictly handles the LLM proxying. The React client fetches necessary context data, passes it to the AI, and executes any resulting action intents using ookingService.ts.

**Pros**:
- Honors the project's strict architecture rules (DB operations via Client SDK, no Edge Function RLS bypassing).
- Zero database cost for chat logs.

**Cons**:
- Requires the frontend to orchestrate fetching the context data before sending the prompt.

### Option 2: Edge Function Execution
The Edge Function handles both answering prompts and executing confirmed actions natively using the service_role key.

**Pros**:
- Slightly less orchestration required on the frontend.

**Cons**:
- Violates the core AGENTS.md rules regarding RLS and SDK boundaries.

## Decision

**Chosen option**: Option 1: Client-Side SDK Execution

A floating React chat widget that maintains ephemeral state, fetches data context, and communicates with a secure Supabase Edge Function proxy. The AI returns intents, which the React UI renders as 1-click buttons. The actual database execution happens entirely on the client side using the existing ookingService.ts.

## Rationale

Moving database execution to the React client is the only way to strictly comply with the project's architecture rules. It leverages the existing, battle-tested ookingService.ts and standard Row Level Security (RLS) policies instead of dangerously bypassing them with a service_role key in the Edge Function. Keeping the chat ephemeral continues to meet the zero-cost database storage constraint for the free tier.

## Feature design

**Data model sketch**:
- No new tables required (ephemeral chat).
- Actions modify existing tables (courts, staff, ookings for maintenance blocks) via client SDK.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /functions/v1/gemini-advisor | POST | messages (req array), context (opt object) | text_response, suggested_action | Bearer | 401 unauthorized, 500 gemini error |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Send prompt | JWT token | Supabase Auth session |
| Send prompt | Conversation history | React local state (messages array) |
| Send prompt | Business context (heatmap data) | Queried by React client via ookingService.ts and injected into context input |
| Propose Action | Action intent (rate/staff/block) | Gemini structured output (returned by Edge Function) |
| Execute Action | DB mutation | React client SDK calling ookingService.ts |

**Key invariants**:
- The Edge Function must NEVER execute a database mutation; it only returns intents.
- The Edge Function must still verify the JWT role is strictly OWNER or STAFF before calling Gemini, to prevent public abuse of the API key.
- All database updates must pass the existing RLS policies defined in Postgres.

**Security model**:
Access to the Edge Function is strictly limited to OWNER and STAFF roles via JWT decoding. Since the Edge Function no longer mutates data, the primary security layer for actions resides natively in the Postgres RLS policies, invoked exactly as they are in the rest of the Admin Dashboard.

**Configuration required**:
- GEMINI_API_KEY: The API key for Gemini Flash (must be set in Supabase Edge Function secrets).

**Critical test scenarios**:
- Happy path: Admin asks for rate change, AI suggests it, Admin clicks confirm, React client calls ookingService.updateRate(), DB updates. Verifies **AC-1, AC-5, AC-6, AC-7**.
- Failure case: Gemini API times out, UI shows graceful error toast/message. Verifies **AC-8**.
- Concurrency failure: Admin confirms a time slot block but a customer booked it a second prior. Postgres constraint fails, UI catches and shows "Slot already taken". Verifies **AC-9**.
- Auth/permission: Customer (non-admin) tries to call the Edge Function, receives 401. Verifies **AC-4**.

## Build plan

1. Build the floating chat widget UI in React, managing ephemeral state (messages array) and Tailwind styling, satisfies **AC-1**, **AC-2**, **AC-3**
2. Add context-fetching logic to the UI: fetch relevant data via ookingService.ts to append to the prompt context, satisfies **AC-5**
3. Update gemini-advisor Edge Function to accept the messages array, call Gemini, and return structured JSON action intents (acting purely as a proxy), satisfies **AC-4**, **AC-5**
4. Wire the chat UI to the Edge Function to send/receive messages and handle errors gracefully, satisfies **AC-8**
5. Implement the [Confirm Action] button rendering in the UI for recognized JSON action payloads, satisfies **AC-6**
6. Wire the [Confirm Action] UI button to execute the mutation natively using ookingService.ts, capturing concurrency errors, satisfies **AC-7**, **AC-9**

## Consequences

**Positive**:
- 100% compliant with project architecture and RLS security rules.
- Zero database cost for chat logs.

**Negative / tradeoffs**:
- Admin loses chat context upon refreshing the page.
- The frontend assumes the burden of fetching context data before asking the AI a question, which slightly complicates the React orchestration.

## Follow-up

- [ ] Determine the exact JSON schema that Gemini should output so the frontend can reliably parse it into React components (like the heatmap or the action button).
