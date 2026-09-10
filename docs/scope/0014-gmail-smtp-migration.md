# Gmail SMTP Migration

**Workflow:** Alpha
**Status:** done

## Feature Scope

Migrate the existing `send-email` Supabase Edge Function from using the Resend API to using a standard SMTP client library connected to Gmail's SMTP servers. This allows sending transactional emails to arbitrary email addresses without requiring a verified custom domain.

**Done when:** The `send-email` Edge Function uses Deno's SMTP client to successfully authenticate with Gmail using an App Password and dispatches emails, replacing Resend entirely.

- [x] Design it (spec): `docs/specs/0014-gmail-smtp-migration.md`
- [x] Build it: /develop 0014-gmail-smtp-migration
- [x] Verify it: /check verify 0014-gmail-smtp-migration (verified manually)
