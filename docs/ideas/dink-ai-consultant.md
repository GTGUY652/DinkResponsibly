# Dink-Ai: The Strict Business Partner

## Problem Statement
How might we constrain Dink-Ai so it strictly refuses unrelated tasks (like coding) while simultaneously elevating its role to a proactive, data-driven business consultant for the pickleball courts?

## Recommended Direction
**The "Strict Consultant" & "Data-Driven Strategist" hybrid.**
Dink-Ai will be given a rigid system boundary: it will politely but firmly refuse any prompt unrelated to the pickleball business. Within that boundary, it will act as a senior operations manager and marketing consultant. It will analyze available data to suggest pricing changes, identify underutilized courts, and offer general marketing advice tailored to the business. We are punting the "Staff Delegator" features to a future iteration.

## Key Assumptions to Validate
- [ ] **Context Availability:** We are assuming the frontend currently passes enough historical booking data in the request context for the AI to make accurate claims about which courts are underutilized. If it doesn't, the AI might hallucinate its operational advice.
- [ ] **Boundary Tuning:** We are assuming the strict "out-of-scope" rule won't accidentally trigger false positives and block legitimate, slightly-unconventional business questions.

## MVP Scope (What we are doing right now)
- Update the `systemInstruction` in the Edge Function to enforce the strict boundary ("I cannot provide an answer to that question if it is unrelated to the business").
- Add instructions for the AI to adopt the persona of a proactive business partner (offering marketing ideas and operational insights).
- Fix the `show_heatmap` bug by adding a strict constraint to only invoke the action when a *new* heatmap is explicitly requested, preventing spam on follow-up questions.

## Not Doing (and Why)
- **True Proactive Notifications (SMS/Email):** Dink-Ai will be proactive *during* the chat (suggesting ideas based on the data you show it), but it won't text you out of the blue. *Why? Requires background cron jobs and notification infrastructure.*
- **Staff Delegation:** Punted for a later phase. *Why? Needs a dedicated feature discussion on how staff actually receive and act on these tasks.*
