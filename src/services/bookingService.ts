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
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'cancelled' | 'confirmed' | 'checked_in';
  payment_reference_last4?: string;
  receipt_url?: string;
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

export const uploadPaymentReceipt = async (file: File): Promise<string> => {
  // Create a unique file name to avoid collisions
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  const { error } = await supabase.storage
    .from('payment-receipts')
    .upload(filePath, file);

  if (error) {
    throw new Error(`Failed to upload receipt: ${error.message}`);
  }

  // Get the public URL for the uploaded file so the Admin dashboard can view it
  const { data: publicUrlData } = supabase.storage
    .from('payment-receipts')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};

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

  const { data, error } = await supabase.rpc('get_booked_slots', {
    query_date: bookingDate,
  });

  if (error) {
    console.error('Error fetching booked slots via RPC:', error.message);
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

  // Removed .select().single() so we don't trigger the read-security block!
  const { error } = await supabase
    .from('bookings')
    .insert([booking]);

  if (error) {
    if (error.code === '23P04' || error.message.includes('overlap') || error.message.includes('exclude')) {
      throw new Error('This court slot has already been reserved by another player.');
    }
    throw new Error(error.message);
  }

  // We already have the booking_code locally, so we can just return what we sent
  return booking as BookingRecord;
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
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'cancelled' | 'confirmed' | 'checked_in'
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

export interface TrendPoint {
  label: string;
  revenue: number;
  bookingsCount: number;
}

export interface RevenueOverviewData {
  todayRevenue: number;
  todayGrowthPct: number;
  weekRevenue: number;
  weekGrowthPct: number;
  monthRevenue: number;
  monthProgressPct: number;
  ytdRevenue: number;
  ytdGrowthPct: number;
  abv: number;
  pendingBalance: number;
  refundsTotal: number;
  trendChartData: TrendPoint[];
}

export const calculateRevenueOverviewMetrics = (
  bookings: BookingRecord[],
  dateRangeFilter: string = 'this_month',
  courtFilter: string = 'all',
  granularity: 'day' | 'week' | 'month' | 'year' = 'month',
  refDate: Date = new Date()
): RevenueOverviewData => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const todayStr = formatDateStr(refDate);

  const yesterdayDate = new Date(refDate);
  yesterdayDate.setDate(refDate.getDate() - 1);
  const yesterdayStr = formatDateStr(yesterdayDate);

  const filteredBookings = courtFilter === 'all'
    ? bookings
    : bookings.filter((b) => isCourtMatch(b.court_id, courtFilter));

  const activeBookings = filteredBookings.filter((b) => b.status !== 'cancelled');
  const cancelledBookings = filteredBookings.filter((b) => b.status === 'cancelled');

  const todayRev = activeBookings
    .filter((b) => b.booking_date === todayStr)
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const yesterdayRev = activeBookings
    .filter((b) => b.booking_date === yesterdayStr)
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const todayGrowthPct = yesterdayRev > 0
    ? Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100)
    : (todayRev > 0 ? 100 : 0);

  const d7Ago = new Date(refDate);
  d7Ago.setDate(refDate.getDate() - 6);
  const d7AgoStr = formatDateStr(d7Ago);

  const d14Ago = new Date(refDate);
  d14Ago.setDate(refDate.getDate() - 13);
  const d14AgoStr = formatDateStr(d14Ago);

  const weekRev = activeBookings
    .filter((b) => b.booking_date >= d7AgoStr && b.booking_date <= todayStr)
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const prevWeekRev = activeBookings
    .filter((b) => b.booking_date >= d14AgoStr && b.booking_date < d7AgoStr)
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const weekGrowthPct = prevWeekRev > 0
    ? Math.round(((weekRev - prevWeekRev) / prevWeekRev) * 100)
    : (weekRev > 0 ? 100 : 0);

  const curYear = refDate.getFullYear();
  const curMonth = refDate.getMonth() + 1;
  const curMonthPrefix = `${curYear}-${pad(curMonth)}`;

  const prevMonthDate = new Date(curYear, refDate.getMonth() - 1, 1);
  const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}`;

  const monthRev = activeBookings
    .filter((b) => b.booking_date.startsWith(curMonthPrefix))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const prevMonthRev = activeBookings
    .filter((b) => b.booking_date.startsWith(prevMonthPrefix))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const monthProgressPct = prevMonthRev > 0
    ? Math.round(((monthRev - prevMonthRev) / prevMonthRev) * 100)
    : (monthRev > 0 ? 100 : 0);

  const curYearStr = curYear.toString();
  const prevYearStr = (curYear - 1).toString();

  const ytdRev = activeBookings
    .filter((b) => b.booking_date.startsWith(curYearStr))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const prevYtdRev = activeBookings
    .filter((b) => b.booking_date.startsWith(prevYearStr))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const ytdGrowthPct = prevYtdRev > 0
    ? Math.round(((ytdRev - prevYtdRev) / prevYtdRev) * 100)
    : (ytdRev > 0 ? 100 : 0);

  const totalCompletedRev = activeBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const abv = activeBookings.length > 0
    ? Math.round((totalCompletedRev / activeBookings.length) * 100) / 100
    : 0;

  const pendingBalance = activeBookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const refundsTotal = cancelledBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

  let chartBookings = activeBookings;

  if (dateRangeFilter === 'today') {
    chartBookings = activeBookings.filter((b) => b.booking_date === todayStr);
  } else if (dateRangeFilter === 'last_7_days') {
    chartBookings = activeBookings.filter((b) => b.booking_date >= d7AgoStr && b.booking_date <= todayStr);
  } else if (dateRangeFilter === 'this_month') {
    chartBookings = activeBookings.filter((b) => b.booking_date.startsWith(curMonthPrefix));
  }

  const trendMap: { [label: string]: { revenue: number; count: number } } = {};

  chartBookings.forEach((b) => {
    let key = b.booking_date;
    if (granularity === 'day') {
      const parts = b.booking_date.split('-');
      key = parts.length === 3 ? `${parts[1]}/${parts[2]}` : b.booking_date;
    } else if (granularity === 'week') {
      const d = new Date(b.booking_date);
      const dayNum = d.getDate();
      const weekNum = Math.ceil(dayNum / 7);
      key = `Wk ${weekNum}`;
    } else if (granularity === 'month') {
      const parts = b.booking_date.split('-');
      if (parts.length >= 2) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        key = monthNames[mIdx] || parts[1];
      }
    } else if (granularity === 'year') {
      key = b.booking_date.substring(0, 4);
    }

    if (!trendMap[key]) {
      trendMap[key] = { revenue: 0, count: 0 };
    }
    trendMap[key].revenue += b.total_price || 0;
    trendMap[key].count += 1;
  });

  const trendChartData: TrendPoint[] = Object.keys(trendMap).map((label) => ({
    label,
    revenue: trendMap[label].revenue,
    bookingsCount: trendMap[label].count,
  }));

  return {
    todayRevenue: todayRev,
    todayGrowthPct,
    weekRevenue: weekRev,
    weekGrowthPct,
    monthRevenue: monthRev,
    monthProgressPct,
    ytdRevenue: ytdRev,
    ytdGrowthPct,
    abv,
    pendingBalance,
    refundsTotal,
    trendChartData,
  };
};

export const fetchRevenueOverviewData = async (
  dateRange: string = 'this_month',
  courtFilter: string = 'all',
  granularity: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<RevenueOverviewData> => {
  const bookings = await fetchAdminBookings();
  return calculateRevenueOverviewMetrics(bookings, dateRange, courtFilter, granularity);
};