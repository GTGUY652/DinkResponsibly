import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchVenueRules, FALLBACK_VENUE_RULES } from './venueRulesService';
import { sanityClient } from '../lib/sanity';

vi.mock('../lib/sanity', () => ({
  sanityClient: { fetch: vi.fn() },
}));

const mockedFetch = sanityClient.fetch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchVenueRules', () => {
  it('returns Sanity rules ordered by order asc', async () => {
    mockedFetch.mockResolvedValue([
      { _id: 'b', title: 'No-Refund Policy:', description: 'Locked once confirmed.', order: 1 },
      { _id: 'a', title: 'Strict 1-Hour Slots:', description: 'Ends at top of hour.', order: 0 },
    ]);
    const rules = await fetchVenueRules();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(rules.map((r) => r._id)).toEqual(['a', 'b']);
    expect(rules[0]).toEqual({ _id: 'a', title: 'Strict 1-Hour Slots:', description: 'Ends at top of hour.', order: 0 });
  });

  it('falls back to defaults when Sanity returns an empty array', async () => {
    mockedFetch.mockResolvedValue([]);
    await expect(fetchVenueRules()).resolves.toEqual(FALLBACK_VENUE_RULES);
  });

  it('falls back to defaults when Sanity throws (offline)', async () => {
    mockedFetch.mockRejectedValue(new Error('network down'));
    await expect(fetchVenueRules()).resolves.toEqual(FALLBACK_VENUE_RULES);
  });

  it('skips rules with empty title or description but keeps the rest', async () => {
    mockedFetch.mockResolvedValue([
      { _id: 'good', title: 'Proper Footwear:', description: 'Non-marking shoes required.', order: 0 },
      { _id: 'bad1', title: '   ', description: 'Has no title.', order: 1 },
      { _id: 'bad2', title: 'No Body:', description: '   ', order: 2 },
    ]);
    const rules = await fetchVenueRules();
    expect(rules.map((r) => r._id)).toEqual(['good']);
  });

  it('keeps a stable order when two rules share the same order value', async () => {
    mockedFetch.mockResolvedValue([
      { _id: 'second', title: 'B Rule:', description: 'Second doc.', order: 0 },
      { _id: 'first', title: 'A Rule:', description: 'First doc.', order: 0 },
    ]);
    const rules = await fetchVenueRules();
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r._id).sort()).toEqual(['first', 'second']);
  });

  it('defaults missing order to 0 and still returns the rule', async () => {
    mockedFetch.mockResolvedValue([
      { _id: 'no-order', title: 'Walk-ins:', description: 'Subject to availability.' },
    ]);
    const rules = await fetchVenueRules();
    expect(rules).toEqual([{ _id: 'no-order', title: 'Walk-ins:', description: 'Subject to availability.', order: 0 }]);
  });
});
