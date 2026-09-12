import { supabase } from './supabase';


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
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'cancelled' | 'CANCELLED' | 'confirmed' | 'checked_in' | 'NEEDS_REFUND';
  payment_reference_last4?: string;
  receipt_url?: string;
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
  
  // If either is a UUID, they only match if they are perfectly equal (handled above).
  // If one is a name and the other is a UUID, this logic previously caused bugs.
  // Instead, rely on exact matching or strict substring matching if both are names.
  if (a.includes('-') && a.length > 20) return false; // a is UUID
  if (b.includes('-') && b.length > 20) return false; // b is UUID

  if (a.includes('court a') && b.includes('court a')) return true;
  if (a.includes('court b') && b.includes('court b')) return true;
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

  return (data as Array<{ court_id: string; start_hour: number; end_hour: number }>)
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
  const [bookingsRes, courtsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: true })
      .order('start_hour', { ascending: true }),
    supabase.from('courts').select('id, name')
  ]);

  if (bookingsRes.error) {
    console.error('Error fetching admin bookings:', bookingsRes.error.message);
    return [];
  }

  const courtsMap: Record<string, string> = {};
  if (courtsRes.data) {
    courtsRes.data.forEach(c => {
      courtsMap[c.id] = c.name;
    });
  }

  return (bookingsRes.data || []).map((row: any) => {
    // Determine court name either from our lookup map or by a hacky string match if it was stored as a name
    let cName = row.court_id;
    if (courtsMap[row.court_id]) {
      cName = courtsMap[row.court_id];
    } else {
      // If it's already a name, try to standardize it
      const match = Object.values(courtsMap).find(n => n.toLowerCase() === row.court_id.toLowerCase());
      if (match) cName = match;
    }
    return {
      ...row,
      court_name: cName,
    };
  }) as BookingRecord[];
};

export const updateBookingStatus = async (
  id: string,
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'cancelled' | 'confirmed' | 'checked_in' | 'NEEDS_REFUND'
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
  courtBreakdown?: { name: string; bookingsCount: number; revenue: number }[];
}

export const calculateRevenueOverviewMetrics = (
  bookings: BookingRecord[],
  dateRangeFilter: string = 'this_month',
  courtFilter: string = 'all',
  granularity: 'hour' | 'day' | 'week' | 'month' | 'year' = 'month',
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

  const realBookings = filteredBookings.filter((b) => !b.booking_code || !b.booking_code.includes('MAINT'));
  const activeBookings = realBookings.filter((b) => b.status !== 'cancelled' && b.status !== 'CANCELLED');
  const cancelledBookings = realBookings.filter((b) => b.status === 'cancelled' || b.status === 'CANCELLED');

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

  // Pre-fill trendMap to ensure continuous time axis
  if (granularity === 'hour') {
    // Operating hours: 6 AM to 2 AM next day
    const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];
    hours.forEach(hr => {
      const ampm = hr >= 12 ? 'PM' : 'AM';
      const hr12 = hr % 12 || 12;
      trendMap[`${hr12} ${ampm}`] = { revenue: 0, count: 0 };
    });
  } else if (granularity === 'day') {
    if (dateRangeFilter === 'last_7_days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(refDate);
        d.setDate(refDate.getDate() - i);
        const dayStr = formatDateStr(d);
        const parts = dayStr.split('-');
        trendMap[`${parts[1]}/${parts[2]}`] = { revenue: 0, count: 0 };
      }
    } else if (dateRangeFilter === 'this_month') {
      const daysInMonth = new Date(curYear, curMonth, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        trendMap[`${pad(curMonth)}/${pad(i)}`] = { revenue: 0, count: 0 };
      }
    }
  }

  chartBookings.forEach((b) => {
    let key = b.booking_date;
    if (granularity === 'hour') {
      const duration = b.duration_hours && b.duration_hours > 0 ? b.duration_hours : 1;
      const hourlyRevenue = (b.total_price || 0) / duration;
      
      for (let i = 0; i < duration; i++) {
        const hr = (b.start_hour + i) % 24;
        const ampm = hr >= 12 ? 'PM' : 'AM';
        const hr12 = hr % 12 || 12;
        const hKey = `${hr12} ${ampm}`;
        
        if (!trendMap[hKey]) {
          trendMap[hKey] = { revenue: 0, count: 0 };
        }
        trendMap[hKey].revenue += hourlyRevenue;
        trendMap[hKey].count += 1; // Count as an active booking for this hour
      }
    } else {
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
    }
  });

  const trendChartData: TrendPoint[] = Object.keys(trendMap).map((label) => ({
    label,
    revenue: trendMap[label].revenue,
    bookingsCount: trendMap[label].count,
  }));

  const courtMap: { [name: string]: { count: number; revenue: number } } = {};
  chartBookings.forEach((b) => {
    const cName = b.court_name || 'Unknown Court';
    if (!courtMap[cName]) courtMap[cName] = { count: 0, revenue: 0 };
    courtMap[cName].count += 1;
    courtMap[cName].revenue += (b.total_price || 0);
  });
  
  const courtBreakdown = Object.keys(courtMap).map(name => ({
    name,
    bookingsCount: courtMap[name].count,
    revenue: courtMap[name].revenue
  })).sort((a, b) => b.revenue - a.revenue);

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
    courtBreakdown,
  };
};

export const fetchRevenueOverviewData = async (
  dateRange: string = 'this_month',
  courtFilter: string = 'all',
  granularity: 'hour' | 'day' | 'week' | 'month' | 'year' = 'month',
  refDate: Date = new Date()
): Promise<RevenueOverviewData> => {
  const bookings = await fetchAdminBookings();
  return calculateRevenueOverviewMetrics(bookings, dateRange, courtFilter, granularity, refDate);
};

// --- AI CONSULTANT ACTION HELPERS ---

export const updateCourtRate = async (
  courtId: string, 
  rateType: 'weekday_day_rate' | 'weekday_night_rate' | 'weekend_rate', 
  newRate: number
): Promise<void> => {
  const { error } = await supabase
    .from('courts')
    .update({ [rateType]: newRate })
    .eq('id', courtId);
    
  if (error) throw new Error(error.message);
};

export const disableStaffAccount = async (staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', staffId);
    
  if (error) throw new Error(error.message);
};

export const enableStaffAccount = async (staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', staffId);
    
  if (error) throw new Error(error.message);
};

export const createMaintenanceBlock = async (
  courtId: string, 
  date: string, 
  startHour: number, 
  endHour: number, 
  reason: string
): Promise<void> => {
  const blockData = {
    booking_code: `MAINT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    court_id: courtId,
    booking_date: date,
    start_hour: startHour,
    end_hour: endHour,
    duration_hours: endHour - startHour,
    total_price: 0,
    guest_name: `SYSTEM MAINTENANCE: ${reason}`,
    guest_email: 'admin@dinkresponsibly.com',
    guest_phone: 'N/A',
    status: 'APPROVED' as const,
  };
  const { error } = await supabase.from('bookings').insert([blockData]);
  
  if (error) {
    if (error.code === '23P04' || error.message.includes('overlap') || error.message.includes('exclude')) {
      throw new Error('Slot already taken: A customer booked this slot before the block could be applied.');
    }
    throw new Error(error.message);
  }
};

export const fetchBookingsForDateRange = async (
  startDate: string,
  endDate: string,
  courtIds: string[]
): Promise<BookingRecord[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .in('court_id', courtIds)
    .not('status', 'in', '("cancelled","REJECTED")');

  if (error) {
    console.error('Error fetching bookings for date range:', error.message);
    return [];
  }
  return data as BookingRecord[];
};
