import { supabase } from './supabase';

export interface BookingRecord {
  id?: string;
  booking_code: string;
  court_id: string;
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

export const fetchBookedSlots = async (
  courtId: string,
  bookingDate: string
): Promise<{ start_hour: number; end_hour: number }[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select('start_hour, end_hour')
    .eq('court_id', courtId)
    .eq('booking_date', bookingDate)
    .neq('status', 'cancelled');
  if (error) {
    console.error('Error fetching booked slots:', error.message);
    return [];
  }
  return data || [];
};

export const createBooking = async (
  booking: Omit<BookingRecord, 'id' | 'created_at'>
): Promise<BookingRecord> => {
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
    .select('*')
    .order('booking_date', { ascending: true })
    .order('start_hour', { ascending: true });
  if (error) {
    console.error('Error fetching admin bookings:', error.message);
    return [];
  }
  return (data || []) as BookingRecord[];
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