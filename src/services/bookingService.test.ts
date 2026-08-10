import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateBookingCode,
  fetchCourts,
  fetchBookedSlots,
  createBooking,
  fetchAdminBookings,
  updateBookingStatus,
  deleteBookingRecord,
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
        { start_hour: 7, end_hour: 9 },
        { start_hour: 17, end_hour: 18 },
      ];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockResolvedValue({ data: mockSlots, error: null }),
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await fetchBookedSlots('Court A', '2026-12-20');
      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(result).toEqual(mockSlots);
    });

    it('should handle errors gracefully and return an empty array', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await fetchBookedSlots('Court A', '2026-12-20');
      expect(result).toEqual([]);
    });
  });

  describe('createBooking (AC-3)', () => {
    it('should insert a reservation record into Supabase and return the created record', async () => {
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

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedRecord, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const result = await createBooking(newBooking);
      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(insertMock).toHaveBeenCalledWith([newBooking]);
      expect(result).toEqual(insertedRecord);
    });

    it('should throw an error when insert fails', async () => {
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

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
        }),
      });

      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await expect(createBooking(newBooking)).rejects.toThrow('Insert failed');
    });
  });

  describe('fetchAdminBookings (AC-5)', () => {
    it('should fetch and return all admin booking records sorted by date and time', async () => {
      const mockAdminBookings = [
        {
          id: '1',
          booking_code: 'DR-8X9K2L',
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
});
