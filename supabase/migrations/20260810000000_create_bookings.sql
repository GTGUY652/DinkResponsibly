-- 1. Drop existing table and related policies/indexes if present
DROP TABLE IF EXISTS public.bookings CASCADE;

-- 2. Create fresh bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT NOT NULL UNIQUE,
  court_id TEXT NOT NULL, -- 'Court A', 'Court B', 'Court C', 'Court D'
  booking_date DATE NOT NULL,
  start_hour INTEGER NOT NULL, -- 24h format: e.g. 6, 7, 8...
  end_hour INTEGER NOT NULL, -- 24h format: e.g. 7, 8, 9...
  duration_hours INTEGER NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'checked_in', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for fast availability queries by court and date
CREATE INDEX idx_bookings_court_date ON public.bookings (court_id, booking_date);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Allow public read access to bookings"
  ON public.bookings FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow staff update access to bookings"
  ON public.bookings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('OWNER', 'STAFF')));

CREATE POLICY "Allow staff delete access to bookings"
  ON public.bookings FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('OWNER', 'STAFF')));

-- 6. Add atomic constraint to prevent double bookings
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    court_id WITH =,
    booking_date WITH =,
    int4range(start_hour, end_hour) WITH &&
  );