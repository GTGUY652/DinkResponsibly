# Security & Hardening Audit Results

## Findings & Mitigations

### 1. Insecure Row Level Security (RLS) on Bookings
**Issue:** `UPDATE` and `DELETE` RLS policies for `public.bookings` were set to `USING (true)`, allowing unauthorized modifications and deletions of all bookings by any user.
**Mitigation:** Replaced `USING (true)` with an explicit authorization check that requires the user to hold the `OWNER` or `STAFF` role.

### 2. Lack of Atomic Constraints for Overlapping Bookings
**Issue:** Double-booking prevention was handled purely in application code and frontend checks, creating a race condition that could be exploited by rapid concurrent requests. 
**Mitigation:** Added a PostgreSQL `EXCLUDE` constraint (using `btree_gist`) to structurally enforce that no two bookings on the same court and date can overlap in hours at the database level.

### 3. Missing Storage RLS Policies
**Issue:** The `payment-receipts` bucket lacked proper Row Level Security, meaning anyone could upload any file type (e.g. executable scripts) or delete existing receipts.
**Mitigation:** Added RLS policies specifically for `storage.objects` to restrict uploads solely to image types (`.png`, `.jpg`, `.jpeg`) and completely blocked unauthorized deletions (only authenticated admins can delete).

### 4. Unvalidated Input at Edge Function Boundaries
**Issue:** The Supabase Edge Functions (`send-email` and `gemini-advisor`) were directly parsing and acting upon arbitrary `req.json()` payloads without validation, exposing the system to unexpected types, payload injection, and XSS risks.
**Mitigation:** Added strict Zod schema validation to ensure types, fields, and constraints match exactly before any execution logic proceeds. 

### 5. XSS Vulnerability in Email HTML Injection
**Issue:** When an admin responded to a ticket or a user created a booking, unvalidated strings were directly interpolated into the HTML template inside the `send-email` edge function. An attacker submitting a malicious name or support ticket body could inject HTML directly into the rendered email.
**Mitigation:** Added an `htmlEncode` sanitization utility to escape HTML characters before they are passed into the email bodies.

### 6. Dependency Vulnerability Audit
**Issue:** Need to ensure project dependency hygiene.
**Mitigation:** Executed `npm audit` against the lockfile. Output yielded **0 vulnerabilities**, confirming the project dependencies are currently clean.
