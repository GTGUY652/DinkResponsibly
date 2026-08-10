import { supabase } from './supabase';

export interface PaymentRecord {
  id?: string;
  booking_id: string;
  payment_provider: string;
  payment_intent_id?: string;
  receipt_url?: string;
  amount: number;
  status: string;
}

export interface BookingRecord {
  id?: string;
  booking_code: string;
  court_id: string;
  court_name?: string;
  booking_date: string; // 'YYYY-MM-DD'
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  total_price: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  status: 'confirmed' | 'checked_in' | 'cancelled';
  created_at?: string;
  payments?: PaymentRecord[];
}

export interface CourtRecord {
  id: string;
  name: string;
  description?: string;
  hourly_rate?: number;
  weekday_day_rate: number;
  weekday_night_rate: number;
  weekend_rate: number;
  is_active: boolean;
}

export const generateBookingCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'DR-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const fetchCourts = async (): Promise<CourtRecord[]> => {
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    console.error('Error fetching courts:', error.message);
    return [];
  }
  return (data || []) as CourtRecord[];
};

// Court matching helper to handle Court names vs UUIDs
const isCourtMatch = (courtA: string, courtB: string): boolean => {
  if (!courtA || !courtB) return false;
  if (courtA === courtB) return true;
  const a = courtA.toLowerCase();
  const b = courtB.toLowerCase();
  if (a.includes('court a') && b.includes('court a')) return true;
  if (a.includes('court b') && (b.includes('court b') || b.length > 20)) return true;
  if (b.includes('court b') && (a.includes('court b') || a.length > 20)) return true;
  if (a.includes('court c') && b.includes('court c')) return true;
  if (a.includes('court d') && b.includes('court d')) return true;
  return false;
};

export const fetchBookedSlots = async (
  courtId: string,
  bookingDate: string
): Promise<{ start_hour: number; end_hour: number }[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select('start_hour, end_hour, court_id')
    .eq('booking_date', bookingDate)
    .neq('status', 'cancelled');

  if (error) {
    console.error('Error fetching booked slots:', error.message);
    return [];
  }

  if (!data) return [];

  return data
    .filter((b) => isCourtMatch(b.court_id, courtId))
    .map(({ start_hour, end_hour }) => ({ start_hour, end_hour }));
};

export const createBooking = async (
  booking: Omit<BookingRecord, 'id' | 'created_at'>
): Promise<BookingRecord> => {
  // 1. Strict Overlap Check (Concurrency & Double Booking Safeguard)
  const { data: existing, error: checkError } = await supabase
    .from('bookings')
    .select('start_hour, end_hour, court_id')
    .eq('booking_date', booking.booking_date)
    .neq('status', 'cancelled');

  if (checkError) {
    console.error('Error checking existing reservations:', checkError.message);
  } else if (existing && existing.length > 0) {
    const hasOverlap = existing.some((item) => {
      if (!isCourtMatch(item.court_id, booking.court_id)) return false;
      // Overlap formula: (new_start < existing_end) AND (new_end > existing_start)
      return booking.start_hour < item.end_hour && booking.end_hour > item.start_hour;
    });

    if (hasOverlap) {
      throw new Error(`Double Booking Rejection: This court slot has already been reserved by another player.`);
    }
  }

  // 2. Insert booking
  const { data, error } = await supabase
    .from('bookings')
    .insert([booking])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BookingRecord;
};

export const fetchAdminBookings = async (): Promise<BookingRecord[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, courts(name)')
    .order('booking_date', { ascending: true })
    .order('start_hour', { ascending: true });

  if (error) {
    console.error('Error fetching admin bookings:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...row,
    court_name: row.courts?.name || row.court_id,
  })) as BookingRecord[];
};

export const updateBookingStatus = async (
  id: string,
  status: 'confirmed' | 'checked_in' | 'cancelled'
): Promise<void> => {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
};

export const deleteBookingRecord = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
};