# Resend Email Integration

**Workflow:** Beta
**Status:** in-progress

## Feature Scope

Implement the backend logic to automatically dispatch transactional emails via the Resend API using Supabase Edge Functions.
- **Booking Confirmation Email (Database Trigger):** A Supabase Database Webhook that automatically calls the send-email Edge Function when a new booking is inserted. Sends an HTML email with the guest's booking code, contact details, total price, and embedded payment receipt image.
- **Support Ticket Reply (Client API Call):** A direct client API call from the Admin Dashboard to the send-email Edge Function, dispatching an HTML email formatted as a formal response from "DinkResponsibly Support Team", providing immediate UI feedback on delivery status.

**Done when:** The customer automatically receives an email confirmation after booking without blocking the UI, and the admin can successfully send a ticket reply with immediate delivery feedback.

- [x] Design it (spec): [0010-resend-email-integration.md](../specs/0010-resend-email-integration.md)
- [ ] Build it: /develop 0010-resend-email-integration
  - [ ] Implement email_logs table via Supabase migration (satisfies Data Model)
  - [ ] Scaffold send-email Edge Function and integrate Resend API (satisfies AC-1, AC-2)
  - [ ] Configure Postgres Webhook and implement Booking Email thread (satisfies AC-1)
  - [ ] Implement Ticket Reply thread with Auth checks and DB status update (satisfies AC-2)
  - [ ] Integrate Admin Dashboard UI and enforce frontend storage await (satisfies AC-2, AC-3)
- [ ] Verify it: /check verify 0010-resend-email-integration
- [ ] Test it: /test 0010-resend-email-integration
