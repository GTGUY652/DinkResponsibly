export interface HistoricalDateRange {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  type: 'month' | 'day';
  label: string;
}

const MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sept: 9, sep: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const pad = (n: number) => n.toString().padStart(2, '0');
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const isValidDate = (y: number, m: number, d: number) => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  return d <= daysInMonth(y, m);
};

const FULL_MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const levenshtein = (a: string, b: string): number => {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = temp;
    }
  }
  return prev[b.length];
};

/** Fix common month typos (e.g. "septmeber" -> "september") before parsing. */
const normalizeMonthTypos = (text: string): string =>
  text.replace(/[a-z]{5,}/gi, (word) => {
    const w = word.toLowerCase();
    if (MONTHS[w]) return word;
    let best = '';
    let bestDist = 3;
    for (const full of FULL_MONTHS) {
      // Same first letter + close length avoids corrupting words like "much" -> "march".
      if (w[0] !== full[0] || Math.abs(full.length - w.length) > 2) continue;
      const dist = levenshtein(w, full);
      if (dist < bestDist) {
        bestDist = dist;
        best = full;
      }
    }
    // Only accept close matches (dist <= 2) to avoid false positives.
    return bestDist <= 2 ? best : word;
  });

/**
 * Parse a free-text admin query for an explicit historical month or day.
 * Returns null when no historical date intent is found (e.g. "this month").
 * Missing year defaults to refDate's year; bare month names in the future
 * roll back one year so "december" in Oct 2026 means Dec 2025.
 */
export function parseHistoricalDateQuery(
  text: string,
  refDate: Date = new Date()
): HistoricalDateRange | null {
  const lower = normalizeMonthTypos(text).toLowerCase();
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth() + 1;

  // 1. Explicit ISO day: 2026-08-01
  const isoDay = lower.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoDay) {
    const y = Number(isoDay[1]);
    const m = Number(isoDay[2]);
    const d = Number(isoDay[3]);
    if (isValidDate(y, m, d)) {
      const iso = toISO(y, m, d);
      return { start_date: iso, end_date: iso, type: 'day', label: iso };
    }
  }

  // 2. Month name + day + optional year: "august 1 2026", "sept 24", "1 august 2026"
  const monthNames = Object.keys(MONTHS).join('|');
  const monthDayYear =
    lower.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{4}))?\\b`)) ||
    lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+of\\s+(${monthNames})(?:\\s*,?\\s*(\\d{4}))?\\b`));
  if (monthDayYear) {
    // Normalize both orderings: month-first or day-first ("1 of august").
    let monthKey: string;
    let dayNum: number;
    let yearNum: number | undefined;
    if (MONTHS[monthDayYear[1]] && /^\d+$/.test(monthDayYear[2])) {
      monthKey = monthDayYear[1];
      dayNum = Number(monthDayYear[2]);
      yearNum = monthDayYear[3] ? Number(monthDayYear[3]) : undefined;
    } else {
      dayNum = Number(monthDayYear[1]);
      monthKey = monthDayYear[2];
      yearNum = monthDayYear[3] ? Number(monthDayYear[3]) : undefined;
    }
    const m = MONTHS[monthKey];
    const y = yearNum ?? refYear;
    if (m && isValidDate(y, m, dayNum)) {
      const iso = toISO(y, m, dayNum);
      return { start_date: iso, end_date: iso, type: 'day', label: iso };
    }
  }

  // 3. Numeric day: MM/DD/YYYY or MM/DD (e.g. 08/01/2026, 9/24)
  const numericDay = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numericDay) {
    const m = Number(numericDay[1]);
    const d = Number(numericDay[2]);
    let y = refYear;
    if (numericDay[3]) {
      y = Number(numericDay[3]);
      if (y < 100) y += 2000;
    }
    if (isValidDate(y, m, d)) {
      const iso = toISO(y, m, d);
      return { start_date: iso, end_date: iso, type: 'day', label: iso };
    }
  }

  // 4. Explicit ISO month: 2026-08
  const isoMonth = lower.match(/\b(\d{4})-(\d{1,2})\b/);
  if (isoMonth) {
    const y = Number(isoMonth[1]);
    const m = Number(isoMonth[2]);
    if (m >= 1 && m <= 12) {
      const dim = daysInMonth(y, m);
      return {
        start_date: toISO(y, m, 1),
        end_date: toISO(y, m, dim),
        type: 'month',
        label: `${y}-${pad(m)}`,
      };
    }
  }

  // 5. "last month" relative
  if (/\blast\s+month\b/.test(lower)) {
    const d = new Date(refYear, refMonth - 2, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dim = daysInMonth(y, m);
    return {
      start_date: toISO(y, m, 1),
      end_date: toISO(y, m, dim),
      type: 'month',
      label: `${y}-${pad(m)}`,
    };
  }

  // 6. Month name + optional year: "august", "month of august 2026", "whole month of september"
  // Take the LAST match: the target month usually comes at the end of the query.
  const monthOnlyMatches = [...lower.matchAll(new RegExp(`\\b(${monthNames})\\b(?:\\s*,?\\s*(\\d{4}))?`, 'g'))];
  const monthOnly = monthOnlyMatches.length > 0 ? monthOnlyMatches[monthOnlyMatches.length - 1] : null;
  if (monthOnly) {
    const m = MONTHS[monthOnly[1]];
    let y = monthOnly[2] ? Number(monthOnly[2]) : refYear;
    // Bare month name in the future relative to refDate = previous year (past intent).
    if (!monthOnly[2] && m > refMonth) y = refYear - 1;
    if (m) {
      const dim = daysInMonth(y, m);
      return {
        start_date: toISO(y, m, 1),
        end_date: toISO(y, m, dim),
        type: 'month',
        label: `${y}-${pad(m)}`,
      };
    }
  }

  return null;
}
