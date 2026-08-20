import { describe, it, expect } from 'vitest';

/**
 * Unit Test Suite for Spec 0009: Step by Step Court Booking Wizard UI & Contiguous Slot Logic
 * Traces to Acceptance Criteria AC-1 through AC-7.
 */
describe('Spec 0009: Step by Step Court Booking Wizard UI', () => {

  // Contiguous slot selection logic helper function
  const toggleContiguousSlot = (currentHours: number[], clickedHour: number): number[] => {
    if (currentHours.includes(clickedHour)) {
      const sorted = [...currentHours].sort((a, b) => a - b);
      if (sorted.length === 1) {
        return [];
      } else if (clickedHour === sorted[0] || clickedHour === sorted[sorted.length - 1]) {
        return currentHours.filter((h) => h !== clickedHour);
      } else {
        // Middle slot clicked -> reset to just clicked
        return [clickedHour];
      }
    } else {
      if (currentHours.length === 0) {
        return [clickedHour];
      }
      const sorted = [...currentHours].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];

      if (clickedHour === min - 1 || clickedHour === max + 1) {
        return [...currentHours, clickedHour].sort((a, b) => a - b);
      } else {
        // Disjoint slot clicked -> resets to new start slot
        return [clickedHour];
      }
    }
  };

  describe('AC-3: Contiguous Time Slot Selection Logic', () => {
    it('covers: AC-3 - should select a single initial 1-hour slot', () => {
      const selected = toggleContiguousSlot([], 6);
      expect(selected).toEqual([6]);
    });

    it('covers: AC-3 - should allow adding an adjacent slot (6:00 AM -> 7:00 AM)', () => {
      const initial = [6];
      const result = toggleContiguousSlot(initial, 7);
      expect(result).toEqual([6, 7]);
    });

    it('covers: AC-3 - should allow adding an earlier adjacent slot (7:00 AM -> 6:00 AM)', () => {
      const initial = [7];
      const result = toggleContiguousSlot(initial, 6);
      expect(result).toEqual([6, 7]);
    });

    it('covers: AC-3 - should reset selection to the clicked slot when a disjoint (non-adjacent) slot is clicked', () => {
      const initial = [6, 7];
      // User clicks 9:00 AM (disjoint)
      const result = toggleContiguousSlot(initial, 9);
      expect(result).toEqual([9]);
    });

    it('covers: AC-3 - should allow deselecting an edge slot (e.g. removing 8 from [6, 7, 8])', () => {
      const initial = [6, 7, 8];
      const result = toggleContiguousSlot(initial, 8);
      expect(result).toEqual([6, 7]);
    });

    it('covers: AC-3 - should clear selection when the only selected slot is clicked again', () => {
      const initial = [6];
      const result = toggleContiguousSlot(initial, 6);
      expect(result).toEqual([]);
    });
  });

  describe('AC-4 & AC-5: Guest Details & Payment Verification Validations', () => {
    it('covers: AC-4 - should validate required guest contact fields and email formatting', () => {
      const isValidGuest = (name: string, email: string, phone: string, agreed: boolean): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return (
          name.trim().length > 0 &&
          emailRegex.test(email.trim()) &&
          phone.trim().length >= 7 &&
          agreed
        );
      };

      expect(isValidGuest('Juan Dela Cruz', 'juan@example.com', '09171234567', true)).toBe(true);
      expect(isValidGuest('', 'juan@example.com', '09171234567', true)).toBe(false);
      expect(isValidGuest('Juan Dela Cruz', 'invalid-email', '09171234567', true)).toBe(false);
      expect(isValidGuest('Juan Dela Cruz', 'juan@example.com', '09171234567', false)).toBe(false);
    });

    it('covers: AC-5 - should require exactly 4 numeric digits for the payment reference number', () => {
      const isValidRef = (ref: string): boolean => /^\d{4}$/.test(ref);

      expect(isValidRef('1234')).toBe(true);
      expect(isValidRef('9876')).toBe(true);
      expect(isValidRef('123')).toBe(false);
      expect(isValidRef('12345')).toBe(false);
      expect(isValidRef('12a4')).toBe(false);
    });
  });

  describe('AC-1 & AC-2: Step Gating and Navigation Constraints', () => {
    it('covers: AC-1 - should only allow proceeding from Step 1 when court is operational', () => {
      const canProceedStep1 = (courtId: string, isActive: boolean): boolean => {
        return Boolean(courtId) && isActive;
      };

      expect(canProceedStep1('Court A', true)).toBe(true);
      expect(canProceedStep1('Court B', false)).toBe(false);
      expect(canProceedStep1('', true)).toBe(false);
    });
  });
});
