# 0014. Migrate to Gmail SMTP

**Date**: 2026-09-10
**Status**: Accepted

## Summary

This spec replaces the Resend API with Gmail SMTP for sending transactional emails from the `send-email` Edge Function. The system currently fails to send emails to real users because the Resend free tier requires a verified custom domain. By authenticating directly with Gmail using an App Password and Deno's native SMTP client, we can send receipts and ticket replies to any email address without purchasing a domain.

## Context

The booking system generates transactional emails for booking confirmations and support ticket replies. These are dispatched by a Supabase Edge Function (`send-email`). Initially, the Resend API was chosen for this task. However, Resend restricts free-tier accounts from sending emails to unverified addresses, blocking the delivery of receipts to actual customers since the project lacks a custom domain.

To unblock the MVP, we need to send emails using a standard SMTP transport connected to a free Gmail account, bypassing the need for domain verification.

## Requirements

**User stories**:
- As a venue owner, I want my system to email booking receipts to any customer's email address so that they receive confirmation of their manual payment.
- As an admin, I want to reply to support tickets directly to the user's inbox without domain restrictions.

**Acceptance criteria**:
- **AC-1**: The `send-email` Edge Function connects to `smtp.gmail.com` using `deno.land/x/smtp` and authenticates using Supabase Edge Function Secrets (`GMAIL_EMAIL` and `GMAIL_APP_PASSWORD`).
- **AC-2**: The function successfully sends the booking confirmation HTML email to the customer's provided email address and logs the result to `email_logs`.
- **AC-3**: The function successfully sends support ticket replies to the customer's email address and logs the result to `email_logs`.
- **AC-4**: All Resend API logic, imports, and API keys are completely removed from the Edge Function code.
- **AC-5**: If the Gmail SMTP rate limit is reached or the connection fails, the function catches the error, fails gracefully, and logs the failure to `email_logs` without crashing the database webhook.

## Options considered

### Option 1: Use `deno.land/x/smtp`
The community standard SMTP client for Deno.
**Pros**:
- Native Deno module, no Node compatibility layer required.
- Fast boot time for Edge Functions.
**Cons**:
- Community maintained, not an official Deno standard library.

### Option 2: Use Node `nodemailer`
The standard Node.js email client, run via Deno's npm specifiers.
**Pros**:
- Battle-tested, massive ecosystem.
**Cons**:
- Heavier dependency, requires npm compatibility layer which can sometimes be slower to boot in Edge Functions.

## Decision

**Chosen option**: Option 1: Use `deno.land/x/smtp`

We will rewrite the `send-email` Edge Function to use `deno.land/x/smtp` as the transport layer, authenticating against Gmail's SMTP servers using an App Password. The old Resend code will be completely removed. We will rely on simple graceful failure for rate limits rather than building a complex queueing system.

**Implementation skills**: None specific.

## Rationale

The primary constraint is cost and domain ownership. Using Gmail SMTP with an App Password completely circumvents the domain verification requirement of services like Resend, SendGrid, or AWS SES. Since Deno's `x/smtp` is native and lightweight, it fits well inside a Supabase Edge Function. By removing the Resend logic entirely rather than leaving it commented out, we reduce code bloat and maintain a single source of truth for the email transport.

## Feature design

**Data model sketch**:
Unchanged. Continues to use the existing `email_logs` table.

**API surface**:
Unchanged. The Edge Function payload signature remains the same (`booking_id` for webhooks, or `ticket_id` + `admin_reply_message` for direct calls).

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| `send-email` | SMTP Credentials | Supabase Edge Function Secrets (`GMAIL_EMAIL`, `GMAIL_APP_PASSWORD`) |
| `send-email` | Sender Email | `GMAIL_EMAIL` secret |
| `send-email` | Recipient Email | Fetched from database (`bookings` or `support_tickets` table) |

**Key invariants**:
- The SMTP connection must be closed explicitly after the email is sent (or if an error is thrown) to prevent Edge Function execution leaks.

**Security model**:
- Google requires an "App Password" to be generated for the Gmail account since standard password auth over SMTP is disabled for security. This password must be stored securely in Supabase Secrets, not committed to code.

**Configuration required**:
- `GMAIL_EMAIL`: The Gmail address used to authenticate and send the email.
- `GMAIL_APP_PASSWORD`: The 16-character Google App Password.

**Critical test scenarios**:
- Happy path: Webhook triggers Edge Function, connects to Gmail, sends booking email, logs success. Verifies **AC-1, AC-2, AC-4**.
- Failure case: Invalid Gmail App Password provided. Function catches auth error, logs failure to `email_logs`, and does not crash. Verifies **AC-5**.

## Build plan

1. Generate a Google App Password for the target Gmail account and set the `GMAIL_EMAIL` and `GMAIL_APP_PASSWORD` secrets in the local/production Supabase environment.
2. Refactor the `send-email` Edge Function to import `deno.land/x/smtp`. Remove all Resend dependencies and API calls, satisfying **AC-4**.
3. Implement the SMTP connection and authentication logic using the newly injected secrets, satisfying **AC-1**.
4. Update the Booking and Ticket Reply threads to dispatch the HTML payloads via the SMTP client, ensuring the connection is cleanly closed and results are written to `email_logs`, satisfying **AC-2, AC-3, AC-5**.

## Consequences

**Positive**:
- Can send emails to any recipient for free.
- No need to purchase or verify a custom domain.

**Negative / tradeoffs**:
- Gmail limits sending to 500 emails per rolling 24-hour period.
- Emails will come from a `@gmail.com` address, which looks less professional than a custom domain.
- Slower dispatch time compared to HTTP API (SMTP handshake takes longer).

**Neutral**:
- Relies on Deno community packages instead of official vendor SDKs.

## Follow-up

- [ ] Create a Google App Password for the Gmail account before running the implementation.
