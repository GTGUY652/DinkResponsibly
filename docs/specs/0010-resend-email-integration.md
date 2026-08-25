# 0010-resend-email-integration

**Status:** Accepted

## Summary

This spec defines the integration of the Resend email API using a Supabase Edge Function to dispatch transactional emails for customer booking confirmations and admin support ticket replies. It uses a Database Webhook to automatically trigger booking emails, and a direct client API call for ticket replies, tracking delivery statuses in a new database table.

## Context

The booking system successfully records reservations and support tickets in the database, but currently lacks the actual email dispatch logic to notify customers. We need a reliable mechanism to send these emails. To ensure a seamless customer experience during checkout, the email dispatch for bookings must happen asynchronously so a third-party email failure does not block a successful payment and reservation. 

## Options considered

1. **Synchronous Frontend Flow for Bookings:**
   - Pros: Simple to implement.
   - Cons: Customer checkout UI is blocked while waiting for the email API. If the email API times out, the UI might show an error even though the database recorded the booking.
2. **Asynchronous Database Webhook (Chosen):**
   - Pros: Lightning fast customer checkout. The frontend saves to the database and immediately shows success. The email dispatches in the background. Highly reliable.
   - Cons: Requires configuring a Postgres Webhook in Supabase.
3. **Complex HTML Template Engine (e.g. React Email):**
   - Pros: Beautiful, component-driven emails.
   - Cons: Overhead and complexity for the MVP edge function.
4. **Basic Inline String Interpolation (Chosen):**
   - Pros: Easiest to maintain and deploy in a Deno Edge Function for the MVP.
   - Cons: Harder to scale to highly complex email designs later.

## Decision

We will implement a single Supabase Edge Function (send-email) that handles two payload types:
1. **Booking Confirmation:** Triggered by a Supabase Database Webhook on INSERT to the ookings table. The webhook payload sends the ooking_id.
2. **Ticket Reply:** Triggered by a direct client-side API call from the Admin Dashboard, sending 	icket_id and dmin_reply_message.

Both flows will fetch the required entity details securely from the database within the Edge Function, construct an HTML email using inline string interpolation, send it via Resend, and log the outcome to a new email_logs table. 

**Implementation skills:** None specific (standard Deno/Supabase).

## Feature design

### Data model

| Entity | Primary Key | Fields (Type) | Relationships |
| :--- | :--- | :--- | :--- |
| **email_logs** | email_id (uuid) | created_at (timestamp)<br>ecipient_email (text)<br>email_type (text: 'booking' or 'ticket')<br>status (text: 'sent' or 'failed')<br>error_message (text, nullable) | ooking_id (uuid, nullable) -> FK to ookings table<br>	icket_id (uuid, nullable) -> FK to support_tickets table |

### Value sourcing

| Value needed | Source |
| :--- | :--- |
| **Sender Identity (From)** | hello@dinkresponsibly.com (or the verified Resend domain). |
| **Subject Lines** | Booking: "Your Court Booking Confirmed". Ticket: "Re: Support Ticket [TICKET_CODE]". |
| **Booking Details (Guest, Code, Price, Court, Date, Time, Receipt URL)** | Edge Function fetches from ookings table (joining relations) using the ooking_id provided by the Webhook. (Fetching ensures fresh joined data rather than relying purely on the webhook payload). |
| **Customer Email for Ticket** | Edge Function fetches from support_tickets table using the 	icket_id provided by the Admin UI. |
| **Admin Reply Message** | Client payload from the Admin Dashboard. |

### Lifecycle / State machine

- **Email Dispatch:** Starts implicitly when triggered.
- **Success:** Logs 'sent' to email_logs. For tickets, the Edge Function also updates the ticket status to 'Resolved' in the support_tickets table. Webhook fails silently to the user. Admin UI returns 200 OK.
- **Failure:** Logs 'failed' with error message to email_logs. Admin UI returns 500 error (showing a toast to the Admin).

### Security / Authorization

- **Booking Webhook:** Authenticated via the standard Supabase Webhook secret signature validation to ensure the caller is exactly the database trigger.
- **Ticket Reply:** The Edge Function verifies the authorization header and explicitly checks that the invoking user has the OWNER or STAFF role before proceeding.

### Error handling & edge cases

- **Upload Race Condition:** The frontend MUST completely finish uploading the receipt image to Supabase Storage before it inserts the booking record. Otherwise, the webhook will fire and the email will contain a broken image link.
- **Resend API Timeout:** If Resend API times out or fails during a Ticket Reply, the Edge Function returns a 500 error to the Admin Dashboard. The UI catches this and displays an error toast so the Admin knows to try again.
- **Silent Failures:** If Resend API fails during a Booking Webhook, it logs the failure silently in email_logs. The customer checkout is unaffected. (MVP scope explicitly excludes retry queues).

## Requirements

- **AC-1:** A database webhook fires on a new booking insert, sending ooking_id to the send-email function. The function fetches the full booking details (including Court, Date, Time), generates the public receipt image URL, and sends the HTML email via Resend, logging the result to email_logs.
- **AC-2:** The Admin Dashboard calls send-email passing 	icket_id and dmin_reply_message. The function fetches the customer's email from the ticket record, sends the response via Resend, updates the ticket status to 'Resolved', logs the result, and returns an appropriate success or error response to the UI.
- **AC-3:** The frontend checkout sequence strictly waits for the receipt upload to resolve fully before executing the database insert to prevent image link race conditions in the webhook.

## Build plan

Following a Tracer Bullet approach:
1. **Migration:** Create the email_logs table via Supabase migration (satisfies Data Model).
2. **Edge Function Scaffold:** Scaffold the send-email Deno Edge Function and wire up the basic Resend API client using the existing secret (satisfies AC-1, AC-2).
3. **Webhook Thread:** Configure the Postgres Webhook on the ookings table with signature validation. Implement the ooking_id lookup and inline HTML email generation (with Court, Date, Time) in the Edge Function (satisfies AC-1).
4. **Ticket Thread:** Implement the authorization check (OWNER/STAFF), ticket lookup, and the support_tickets 'Resolved' state update in the Edge Function (satisfies AC-2).
5. **Frontend Integration:** Ensure frontend awaits storage upload before booking insert (satisfies AC-3). Implement the client-side call in the Admin Dashboard for ticket replies, including the 500 error toast UI (satisfies AC-2, Error handling).
6. **Logging:** Finalize the insertion of success/failure records into email_logs across both threads (satisfies AC-1, AC-2).

## Consequences

- The email_logs table will grow over time and may need a retention policy (e.g. delete after 90 days) later on.
- Generating HTML emails inline keeps the MVP simple but will be harder to restyle if marketing wants complex, branded emails later.

## Follow-up

- Monitor the email_logs table for frequent silent failures on bookings.
