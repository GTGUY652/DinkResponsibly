CREATE TABLE public.email_logs (
    email_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recipient_email TEXT NOT NULL,
    email_type TEXT NOT NULL CHECK (email_type IN ('booking', 'ticket')),
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL
);

-- Enable RLS (Edge Functions bypass this using the service role key)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Allow Admins to read the logs (optional, but good practice based on AGENTS.md roles)
CREATE POLICY "Allow Admins to read email logs" 
    ON public.email_logs 
    FOR SELECT 
    USING (
      (SELECT role FROM public.users WHERE id = auth.uid()) IN ('OWNER', 'STAFF')
    );