import { sanityClient } from '../lib/sanity';

export interface VenueRule {
  _id: string;
  title: string;
  description: string;
  order: number;
}

export const FALLBACK_VENUE_RULES: VenueRule[] = [
  {
    _id: 'fallback-1',
    title: 'Strict 1-Hour Slots:',
    description: 'Court access ends promptly at the top of the hour to accommodate incoming players.',
    order: 0,
  },
  {
    _id: 'fallback-2',
    title: 'No-Refund Policy:',
    description: 'Reservations are locked and non-refundable once confirmed.',
    order: 1,
  },
  {
    _id: 'fallback-3',
    title: 'Proper Footwear:',
    description: 'Non-marking athletic court shoes are required on all courts.',
    order: 2,
  },
];

export const VENUE_RULES_QUERY = `*[_type == "venueRule"] | order(order asc) { _id, title, description, order }`;

interface RawVenueRule {
  _id: string;
  title?: unknown;
  description?: unknown;
  order?: unknown;
}

export const fetchVenueRules = async (): Promise<VenueRule[]> => {
  try {
    const data = await sanityClient.fetch<RawVenueRule[]>(VENUE_RULES_QUERY);
    if (!data || data.length === 0) return FALLBACK_VENUE_RULES;
    const cleaned: VenueRule[] = [];
    for (const raw of data) {
      const title = typeof raw.title === 'string' ? raw.title.trim() : '';
      const description = typeof raw.description === 'string' ? raw.description.trim() : '';
      if (!title || !description) continue;
      const order = typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : 0;
      cleaned.push({ _id: raw._id, title, description, order });
    }
    if (cleaned.length === 0) return FALLBACK_VENUE_RULES;
    return cleaned
      .map((rule, index) => ({ rule, index }))
      .sort((a, b) => a.rule.order - b.rule.order || a.index - b.index)
      .map(({ rule }) => rule);
  } catch {
    return FALLBACK_VENUE_RULES;
  }
};
