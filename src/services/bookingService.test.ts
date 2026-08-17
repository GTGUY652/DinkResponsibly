import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateBookingCode,
  fetchCourts,
  fetchBookedSlots,
  createBooking,
  fetchAdminBookings,
  updateBookingStatus,
  deleteBookingRecord,
  calculateRevenueOverviewMetrics,
  fetchRevenueOverviewData,
} from './bookingService';
import type { BookingRecord, CourtRecord } from './bookingService';
import { supabase } from './supabase';

// Mock Supabase client
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('bookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateBookingCode (AC-3)', () => {
    it('should generate a code starting with DR- and length of 9 characters', () => {
      const code = generateBookingCode();
      expect(code).toMatch(/^DR-[A-Z0-9]{6}$/);
      expect(code.length).toBe(9);
    });

    it('should generate unique booking codes on subsequent calls', () => {
      const code1 = generateBookingCode();
      const code2 = generateBookingCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('fetchCourts (0004 AC-1)', () => {
    it('should fetch and return court records sorted by name', async () => {
      const mockCourts: CourtRecord[] = [
        { id: 'Court A', name: 'Court A', weekday_day_rate: 400, weekday_night_rate: 500, weekend_rate: 500, is_active: true },
        { id: 'Court B', name: 'Court B', weekday_day_rate: 400, weekday_night_rate: 500, weekend_rate: 500, is_active: false },
      ];

      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockCourts, error: null }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await fetchCourts();
      expect(supabase.from).toHaveBeenCalledWith('courts');
      expect(result).toEqual(mockCourts);
    });

    it('should handle errors gracefully and return an empty array', async () => {
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await fetchCourts();
      expect(result).toEqual([]);
    });
  });

  describe('fetchBookedSlots (AC-1, AC-4)', () => {
    it('should return booked hour ranges for a specific court and date', async () => {
      const mockSlots = [
        { start_hour: 7, end_hour: 9, court_id: 'Court A' },
        { start_hour: 17, end_hour: 18, court_id: 'Court A' },
      ];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({ data: mockSlots, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await fetchBookedSlots('Court A', '2026-12-20');
      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(result).toEqual([
        { start_hour: 7, end_hour: 9 },
        { start_hour: 17, end_hour: 18 },
      ]);
    });

    it('should handle errors gracefully and return an empty array', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await fetchBookedSlots('Court A', '2026-12-20');
      expect(result).toEqual([]);
    });
  });

  describe('createBooking (AC-3, Double Booking Safeguard)', () => {
    it('should insert a reservation record into Supabase if no overlap exists', async () => {
      const newBooking: Omit<BookingRecord, 'id' | 'created_at'> = {
        booking_code: 'DR-TEST01',
        court_id: 'Court A',
        booking_date: '2026-12-20',
        start_hour: 8,
        end_hour: 11,
        duration_hours: 3,
        total_price: 1200,
        guest_name: 'Juan Dela Cruz',
        guest_email: 'juan@example.com',
        guest_phone: '09171234567',
        status: 'confirmed',
      };

      const insertedRecord = { id: 'uuid-123', ...newBooking, created_at: '2026-08-10T00:00:00Z' };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: insertedRecord, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await createBooking(newBooking);
      expect(result).toEqual(insertedRecord);
    });

    it('should reject booking with an error if an overlapping reservation exists', async () => {
      const newBooking: Omit<BookingRecord, 'id' | 'created_at'> = {
        booking_code: 'DR-TEST02',
        court_id: 'Court B',
        booking_date: '2026-08-10',
        start_hour: 15, // 3 PM
        end_hour: 16,   // 4 PM
        duration_hours: 1,
        total_price: 400,
        guest_name: 'Enz',
        guest_email: 'enz@example.com',
        guest_phone: '09171234567',
        status: 'confirmed',
      };

      const existingBookings = [
        { start_hour: 15, end_hour: 16, court_id: 'Court B' },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: existingBookings, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(createBooking(newBooking)).rejects.toThrow('Double Booking Rejection');
    });
  });

  describe('fetchAdminBookings (AC-5)', () => {
    it('should fetch and return all admin booking records sorted by date and time', async () => {
      const mockAdminBookings = [
        {
          id: '1',
          booking_code: 'DR-8X9K2L',
          court_id: 'Court A',
          court_name: 'Court A',
          booking_date: '2026-12-20',
          start_hour: 8,
          end_hour: 11,
          duration_hours: 3,
          total_price: 1200,
          guest_name: 'Juan Dela Cruz',
          guest_email: 'juan@example.com',
          guest_phone: '09171234567',
          status: 'confirmed',
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockAdminBookings, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await fetchAdminBookings();
      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(result).toEqual(mockAdminBookings);
    });
  });

  describe('updateBookingStatus (AC-5)', () => {
    it('should update booking status successfully', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockReturnValue({ update: updateMock });

      await updateBookingStatus('uuid-123', 'checked_in');
      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(updateMock).toHaveBeenCalledWith({ status: 'checked_in' });
    });
  });

  describe('deleteBookingRecord (AC-5)', () => {
    it('should delete a booking record successfully', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await deleteBookingRecord('uuid-123');
      expect(supabase.from).toHaveBeenCalledWith('bookings');
    });
  });

  describe('Spec 0005: Revenue Overview & Financials (AC-1, AC-2, AC-3, AC-4)', () => {
    const mockBookings: BookingRecord[] = [
      {
        id: '1',
        booking_code: 'DR-100',
        court_id: 'Court A',
        booking_date: '2026-08-10',
        start_hour: 10,
        end_hour: 11,
        duration_hours: 1,
        total_price: 400,
        guest_name: 'Alice',
        guest_email: 'alice@test.com',
        guest_phone: '1234567890',
        status: 'confirmed',
      },
      {
        id: '2',
        booking_code: 'DR-101',
        court_id: 'Court A',
        booking_date: '2026-08-10',
        start_hour: 17,
        end_hour: 18,
        duration_hours: 1,
        total_price: 500,
        guest_name: 'Bob',
        guest_email: 'bob@test.com',
        guest_phone: '1234567890',
        status: 'checked_in',
      },
      {
        id: '3',
        booking_code: 'DR-102',
        court_id: 'Court B',
        booking_date: '2026-08-09',
        start_hour: 14,
        end_hour: 15,
        duration_hours: 1,
        total_price: 400,
        guest_name: 'Charlie',
        guest_email: 'charlie@test.com',
        guest_phone: '1234567890',
        status: 'confirmed',
      },
      {
        id: '4',
        booking_code: 'DR-103',
        court_id: 'Court A',
        booking_date: '2026-08-08',
        start_hour: 9,
        end_hour: 10,
        duration_hours: 1,
        total_price: 400,
        guest_name: 'David',
        guest_email: 'david@test.com',
        guest_phone: '1234567890',
        status: 'cancelled',
      },
    ];

    const refDate = new Date('2026-08-10T12:00:00Z');

    it('AC-1: should calculate Today, Week, Month, and YTD revenue aggregates with growth indicators', () => {
      const metrics = calculateRevenueOverviewMetrics(mockBookings, 'this_month', 'all', 'month', refDate);

      // Today (2026-08-10): DR-100 (400) + DR-101 (500) = 900
      expect(metrics.todayRevenue).toBe(900);
      // Yesterday (2026-08-09): DR-102 (400) -> Growth = ((900-400)/400)*100 = 125%
      expect(metrics.todayGrowthPct).toBe(125);

      // Week revenue includes 2026-08-10 (900) + 2026-08-09 (400) = 1300
      expect(metrics.weekRevenue).toBe(1300);

      // Month revenue (Aug 2026) = 1300
      expect(metrics.monthRevenue).toBe(1300);

      // YTD revenue (2026) = 1300
      expect(metrics.ytdRevenue).toBe(1300);
    });

    it('AC-2: should compute Average Booking Value (ABV), Pending Balances, and Refunds', () => {
      const metrics = calculateRevenueOverviewMetrics(mockBookings, 'this_month', 'all', 'month', refDate);

      // Active bookings count: 3 (DR-100, DR-101, DR-102), total rev = 1300. ABV = 1300 / 3 = 433.33
      expect(metrics.abv).toBe(433.33);

      // Pending balance (confirmed bookings: DR-100 [400] + DR-102 [400]) = 800
      expect(metrics.pendingBalance).toBe(800);

      // Refunds & Adjustments (cancelled booking DR-103 total price) = 400
      expect(metrics.refundsTotal).toBe(400);
    });

    it('AC-3: should format trend chart points by specified granularity', () => {
      const dayMetrics = calculateRevenueOverviewMetrics(mockBookings, 'this_month', 'all', 'day', refDate);
      expect(dayMetrics.trendChartData).toBeDefined();
      expect(dayMetrics.trendChartData.length).toBeGreaterThan(0);

      const monthMetrics = calculateRevenueOverviewMetrics(mockBookings, 'this_month', 'all', 'month', refDate);
      expect(monthMetrics.trendChartData[0].label).toBe('Aug');
      expect(monthMetrics.trendChartData[0].revenue).toBe(1300);
    });

    it('AC-4: should filter metrics by Court ID', () => {
      const courtAMetrics = calculateRevenueOverviewMetrics(mockBookings, 'this_month', 'Court A', 'month', refDate);

      // Court A active bookings: DR-100 (400) + DR-101 (500) = 900
      expect(courtAMetrics.todayRevenue).toBe(900);
      expect(courtAMetrics.monthRevenue).toBe(900);
      expect(courtAMetrics.abv).toBe(450);
    });

    it('fetchRevenueOverviewData: should orchestrate Supabase fetch and return metric payload', async () => {
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const res = await fetchRevenueOverviewData('this_month', 'all', 'month');
      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(res.todayRevenue).toBeGreaterThanOrEqual(0);
      expect(res.trendChartData).toBeDefined();
    });
  });
});
