import { describe, it, expect } from 'vitest';
import { parseHistoricalDateQuery } from './historicalDateParser';

const REF = new Date(2026, 9, 14); // Oct 14 2026

describe('parseHistoricalDateQuery', () => {
  it('parses whole month of september (bare name, past year roll)', () => {
    expect(parseHistoricalDateQuery('provide me with the whole month of september', REF)).toEqual({
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      type: 'month',
      label: '2026-09',
    });
  });

  it('parses overall revenue month of august', () => {
    expect(parseHistoricalDateQuery('Give me the overall revenue i got on the month of august', REF)).toEqual({
      start_date: '2026-08-01',
      end_date: '2026-08-31',
      type: 'month',
      label: '2026-08',
    });
  });

  it('parses specific day august 1 2026', () => {
    expect(parseHistoricalDateQuery('How much revenue did i get on august 1 2026', REF)).toEqual({
      start_date: '2026-08-01',
      end_date: '2026-08-01',
      type: 'day',
      label: '2026-08-01',
    });
  });

  it('parses september 24 defaulting to ref year', () => {
    expect(parseHistoricalDateQuery('record on september 24', REF)).toEqual({
      start_date: '2026-09-24',
      end_date: '2026-09-24',
      type: 'day',
      label: '2026-09-24',
    });
  });

  it('parses ISO day and ISO month', () => {
    expect(parseHistoricalDateQuery('revenue on 2026-08-01', REF)?.type).toBe('day');
    expect(parseHistoricalDateQuery('revenue for 2026-08', REF)).toEqual({
      start_date: '2026-08-01',
      end_date: '2026-08-31',
      type: 'month',
      label: '2026-08',
    });
  });

  it('rolls future bare month back one year', () => {
    expect(parseHistoricalDateQuery('december report', REF)?.start_date).toBe('2025-12-01');
  });

  it('returns null when no date intent', () => {
    expect(parseHistoricalDateQuery('how is revenue this month?', REF)).toBeNull();
    expect(parseHistoricalDateQuery('show me peak hours', REF)).toBeNull();
  });
});
