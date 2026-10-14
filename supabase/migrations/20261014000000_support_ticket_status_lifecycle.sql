-- Support ticket status lifecycle: replying no longer force-resolves a ticket.
-- Staff now choose the post-reply status (IN_PROGRESS default, RESOLVED deliberate).
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED'));
