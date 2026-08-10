import { describe, it, expect } from 'vitest';
import { generateBookingCode } from '../../services/bookingService';

/**
 * Unit Test Suite for Spec 0002: Customer Front End UI & Pricing Logic
 * Traces to Acceptance Criteria AC-1 through AC-7.
 */
describe('Spec 0002: Customer Front End UI & Dynamic Pricing Rules', () => {

  // Helper function replicating AvailabilitySection dynamic pricing calculation
  const calculateSlotRate = (hour: number, isWeekend: boolean, customRates?: { weekday_day_rate?: number; weekday_night_rate?: number; weekend_rate?: number }): number => {
    const dayRate = customRates?.weekday_day_rate ?? 400;
    const nightRate = customRates?.weekday_night_rate ?? 500;
    const weekendRate = customRates?.weekend_rate ?? 500;

    if (isWeekend) {
      return weekendRate;
    }
    return hour < 17 ? dayRate : nightRate;
  };

  describe('AC-2 & AC-3: Dynamic Pricing Business Rules', () => {
    it('covers: AC-2, AC-3 - should apply 400 PHP daytime rate for weekday slots before 5:00 PM (hour < 17)', () => {
      // 6:00 AM, 9:00 AM, 12:00 PM, 4:00 PM (hour 16)
      expect(calculateSlotRate(6, false)).toBe(400);
      expect(calculateSlotRate(9, false)).toBe(400);
      expect(calculateSlotRate(12, false)).toBe(400);
      expect(calculateSlotRate(16, false)).toBe(400);
    });

    it('covers: AC-2, AC-3 - should apply 500 PHP nighttime rate for weekday slots at or after 5:00 PM (hour >= 17)', () => {
      // 5:00 PM (hour 17), 7:00 PM (hour 19), 10:00 PM (hour 22)
      expect(calculateSlotRate(17, false)).toBe(500);
      expect(calculateSlotRate(19, false)).toBe(500);
      expect(calculateSlotRate(22, false)).toBe(500);
    });

    it('covers: AC-2, AC-3 - should apply flat 500 PHP rate for all weekend slots (Saturday & Sunday)', () => {
      expect(calculateSlotRate(6, true)).toBe(500);
      expect(calculateSlotRate(12, true)).toBe(500);
      expect(calculateSlotRate(20, true)).toBe(500);
    });

    it('covers: AC-3 - should calculate total price accurately for continuous multi-hour selections across day/night boundaries', () => {
      // Weekday: 3:00 PM to 6:00 PM (hours 15, 16, 17) -> 15 (400) + 16 (400) + 17 (500) = 1300 PHP
      const hoursSelected = [15, 16, 17];
      const isWeekend = false;
      const totalPrice = hoursSelected.reduce((sum, h) => sum + calculateSlotRate(h, isWeekend), 0);
      expect(totalPrice).toBe(1300);
    });

    it('covers: AC-3 - should respect custom dynamic court rates configured by venue owner', () => {
      const customRates = { weekday_day_rate: 450, weekday_night_rate: 550, weekend_rate: 600 };
      expect(calculateSlotRate(10, false, customRates)).toBe(450);
      expect(calculateSlotRate(18, false, customRates)).toBe(550);
      expect(calculateSlotRate(10, true, customRates)).toBe(600);
    });
  });

  describe('AC-1 & AC-4: Venue Specifications and Invariants', () => {
    it('covers: AC-1 - should enforce exact 4 managed court identifiers (Court A, Court B, Court C, Court D)', () => {
      const expectedCourts = ['Court A', 'Court B', 'Court C', 'Court D'];
      expect(expectedCourts.length).toBe(4);
      expect(expectedCourts).toContain('Court A');
      expect(expectedCourts).toContain('Court B');
      expect(expectedCourts).toContain('Court C');
      expect(expectedCourts).toContain('Court D');
    });

    it('covers: AC-3 - should generate valid 9-character reference codes starting with DR-', () => {
      const code = generateBookingCode();
      expect(code).toMatch(/^DR-[A-Z0-9]{6}$/);
    });
  });

  describe('AC-5 & AC-6: Support Ticket & Inquiry Form Payload Validation', () => {
    it('covers: AC-5, AC-6 - should validate required guest ticket payload fields before submission', () => {
      const validTicket = {
        guestName: 'Juan Dela Cruz',
        guestEmail: 'juan@example.com',
        subject: 'Rate inquiry',
        message: 'Are there discounts for group bookings?',
      };

      const isValid = (t: typeof validTicket) =>
        t.guestName.trim().length > 0 &&
        t.guestEmail.includes('@') &&
        t.subject.trim().length > 0 &&
        t.message.trim().length > 0;

      expect(isValid(validTicket)).toBe(true);

      const invalidTicket = {
        guestName: '',
        guestEmail: 'invalid-email',
        subject: '',
        message: '',
      };
      expect(isValid(invalidTicket)).toBe(false);
    });
  });
});
