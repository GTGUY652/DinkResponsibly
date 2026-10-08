# Venue Rules CMS (Sanity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Venue rules shown in Step 4 Guest & Terms are managed in Sanity CMS (add / update / delete / reorder) instead of hardcoded JSX.

**Architecture:** Add a `venueRule` Sanity document type; add a `venueRulesService` that fetches ordered rules from Sanity with hardcoded fallback; render the fetched rules in `Step4GuestDetails` and `TermsModal` with the existing CSS classes unchanged.

**Tech Stack:** TypeScript, React 19, Sanity (`@sanity/client` ^8.6.1 via `src/lib/sanity.ts`), Vitest.

**Spec:** N/A — bounded change, design approved in-chat on 2026-10-08 (global rule list, bold-title + description look preserved, Step 4 + TermsModal kept in sync, CMS ops in Sanity Studio, local-only until user go-signal).

## Global Constraints

- Standard React feature folders only (`src/components`, `src/services`, `src/hooks`, `src/lib`); do NOT introduce Clean Architecture layers.
- Sanity config is fixed: `projectId: 'ntfl5n32'`, `dataset: 'production'`, `useCdn: false`, `apiVersion: '2023-05-03'` in `src/lib/sanity.ts` — do not change these values.
- Customer reads go through `sanityClient.fetch`; Supabase Edge Functions stay reserved for Resend emails and Gemini AI only.
- Agreement checkbox text and Step 4 validation in `BookingWizard.tsx:266-282` stay static; this plan only makes the bullet list dynamic.
- DO NOT `git push` and do NOT push to production; local commits only, and only after local testing passes and the user gives the go-signal.

## Review Focus

- Sanity fetch throws or network is offline → customer still sees the 3 default rules instead of an empty box (pinned in Task 2 tests).
- Sanity dataset returns zero `venueRule` documents → customer still sees the 3 default rules (pinned in Task 2 tests).
- A rule document has an empty/whitespace title or description → that rule is hidden, the rest still render (pinned in Task 2 tests).
- Two rules share the same `order` value → both render in a stable, deterministic sequence with no crash (pinned in Task 2 tests).
- A rule description is very long (500+ chars) → list wraps and renders without breaking layout or agreement validation (pinned in Task 4 manual check).

---

### Task 1: Sanity `venueRule` schema type

**Files:**
- Modify: `dinkresponsibly/schemaTypes/index.ts`
- Test: none (Studio schema file; verification is `tsc --noEmit` + Studio typecheck in this task's steps)

**Interfaces:**
- Consumes: existing `heroType` export in the same file (left untouched).
- Produces: `venueRuleType` object (`name: 'venueRule'`) consumed by Sanity Studio and by the GROQ query in Task 2 (`*[_type == "venueRule"]`).

- [ ] **Step 1: Confirm the current schema has no venueRule type**

Run: `grep -c "venueRule" dinkresponsibly/schemaTypes/index.ts || true`
Expected: `0` (proves the type does not exist yet).

- [ ] **Step 2: Add the venueRuleType and register it**

Replace the entire file content of `dinkresponsibly/schemaTypes/index.ts` with:

```ts
export const heroType = {
  name: 'hero',
  type: 'document',
  title: 'Hero Section',
  fields: [
    {
      name: 'description',
      type: 'text',
      title: 'Description'
    },
    {
      name: 'caption',
      type: 'string',
      title: 'Caption under Image'
    },
    {
      name: 'image',
      type: 'image',
      title: 'Hero Image',
      options: { hotspot: true }
    }
  ]
}

export const venueRuleType = {
  name: 'venueRule',
  type: 'document',
  title: 'Venue Rules',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Rule Title',
      description: 'Bold lead-in, e.g. Strict 1-Hour Slots:',
      validation: (Rule: any) => Rule.required().max(80)
    },
    {
      name: 'description',
      type: 'text',
      title: 'Rule Description',
      description: 'Body text shown after the title.',
      validation: (Rule: any) => Rule.required()
    },
    {
      name: 'order',
      type: 'number',
      title: 'Display Order',
      description: 'Lower numbers appear first.',
      initialValue: 0
    }
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description'
    }
  }
}

export const schemaTypes = [heroType, venueRuleType]
```

- [ ] **Step 3: Typecheck the Studio project**

Run: `npx tsc --noEmit -p dinkresponsibly/tsconfig.json`
Expected: PASS with no errors.

- [ ] **Step 4: Commit**

```bash
git add dinkresponsibly/schemaTypes/index.ts
git commit -m "feat: add venueRule schema type to Sanity studio"
```

---

### Task 2: `venueRulesService` with fallback

**Files:**
- Create: `src/services/venueRulesService.ts`
- Create: `src/services/venueRulesService.test.ts`
- Test: `src/services/venueRulesService.test.ts`

**Interfaces:**
- Consumes: `sanityClient` from `src/lib/sanity.ts` (`sanityClient.fetch<T>(query: string) => Promise<T>`); Sanity documents shaped `{ _id: string; title: string; description: string; order?: number }`.
- Produces: `VenueRule` (`{ _id: string; title: string; description: string; order: number }`), `FALLBACK_VENUE_RULES: VenueRule[]`, `VENUE_RULES_QUERY: string`, `fetchVenueRules(): Promise<VenueRule[]>` — consumed by Task 3 (`Step4GuestDetails.tsx`) and Task 4 (`TermsModal.tsx`).

- [ ] **Step 1: Write the failing test**

Create `src/services/venueRulesService.test.ts` with:

```tsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/venueRulesService.test.ts`
Expected: FAIL with `Failed to load url ./venueRulesService` (module does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/services/venueRulesService.ts` with:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/services/venueRulesService.test.ts`
Expected: PASS, 6/6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/venueRulesService.ts src/services/venueRulesService.test.ts
git commit -m "feat: add venueRulesService with Sanity fetch and fallback"
```

---

### Task 3: Dynamic rules in Step 4 Guest Details

**Files:**
- Modify: `src/components/customer/BookingWizard/Step4GuestDetails.tsx:1-10,22-30,132-148`
- Test: `src/services/venueRulesService.test.ts` (already covers data layer; this task adds a render check below as a manual step because no component test harness exists for this file)

**Interfaces:**
- Consumes: `fetchVenueRules()` and `FALLBACK_VENUE_RULES` from `src/services/venueRulesService.ts` (Task 2).
- Produces: unchanged component props (`Step4GuestDetailsProps`); visual output only — the `.venue-policy-card .rules-bullet-list` now renders `rules.length` items instead of 3 hardcoded ones.

- [ ] **Step 1: Write the render expectation (manual failing check)**

Run: `grep -n "Strict 1-Hour Slots" src/components/customer/BookingWizard/Step4GuestDetails.tsx`
Expected: lines `139` (hardcoded bullet) still present — proving the list is still static before this task.

- [ ] **Step 2: Implement dynamic rule loading**

Apply these three edits to `src/components/customer/BookingWizard/Step4GuestDetails.tsx`:

Edit A — replace the import block (lines 1-3):

```tsx
import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { fetchVenueRules, FALLBACK_VENUE_RULES, type VenueRule } from '../../../services/venueRulesService';
import './Step4GuestDetails.css';
```

Edit B — after the props destructuring (after line 30, inside the component body before `return`), insert state + fetch:

```tsx
  const [rules, setRules] = useState<VenueRule[]>(FALLBACK_VENUE_RULES);

  useEffect(() => {
    let isLive = true;
    fetchVenueRules().then((fetched) => {
      if (isLive) setRules(fetched);
    });
    return () => {
      isLive = false;
    };
  }, []);
```

Edit C — replace the hardcoded list (lines 137-147):

```tsx
            <ul className="rules-bullet-list">
              {rules.map((rule) => (
                <li key={rule._id}>
                  <strong>{rule.title}</strong> {rule.description}
                </li>
              ))}
            </ul>
```

The surrounding markup (`div.venue-policy-card`, `div.policy-header` with `ShieldAlert`, `h4 Strict Venue Rules`) stays exactly as-is; only the `<ul>` children become dynamic.

- [ ] **Step 3: Verify no hardcoded bullets remain and types pass**

Run: `grep -n "Court access ends promptly" src/components/customer/BookingWizard/Step4GuestDetails.tsx || true`
Expected: no output (hardcoded description removed; it now lives in `FALLBACK_VENUE_RULES`).

Run: `npx tsc -b`
Expected: PASS with no errors.

- [ ] **Step 4: Run the service tests to confirm nothing regressed**

Run: `npx vitest run src/services/venueRulesService.test.ts`
Expected: PASS, 6/6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/customer/BookingWizard/Step4GuestDetails.tsx
git commit -m "feat: render Step 4 venue rules from Sanity CMS"
```

---

### Task 4: Dynamic rules in TermsModal + full verification

**Files:**
- Modify: `src/components/customer/TermsModal.tsx:1-5,18-42,127-133`
- Test: existing suite (`npm test`); plus the manual Sanity Studio checks in the steps below

**Interfaces:**
- Consumes: `fetchVenueRules()` and `FALLBACK_VENUE_RULES` from `src/services/venueRulesService.ts` (Task 2) — identical consumption pattern to Task 3.
- Produces: unchanged `TermsModalProps`; the `.policy-box .policy-list` renders the same CMS rules as Step 4, keeping both surfaces in sync.

- [ ] **Step 1: Confirm the modal list is still hardcoded**

Run: `grep -n "Non-marking court shoes" src/components/customer/TermsModal.tsx`
Expected: line `131` present — proving the static list is still there before this task.

- [ ] **Step 2: Implement dynamic rule loading in the modal**

Edit A — replace line 1 import with:

```tsx
import React, { useState, useEffect } from 'react';
```

Edit B — after line 5 (`import './TermsModal.css';`), insert:

```tsx
import { fetchVenueRules, FALLBACK_VENUE_RULES, type VenueRule } from '../../services/venueRulesService';
```

Edit C — inside the component body after the state declarations (after line 40 `const [errorMsg, ...]`), insert:

```tsx
  const [venueRules, setVenueRules] = useState<VenueRule[]>(FALLBACK_VENUE_RULES);

  useEffect(() => {
    let isLive = true;
    fetchVenueRules().then((fetched) => {
      if (isLive) setVenueRules(fetched);
    });
    return () => {
      isLive = false;
    };
  }, []);
```

Edit D — replace the hardcoded policy list (lines 128-132):

```tsx
              <ul className="policy-list">
                {venueRules.map((rule) => (
                  <li key={rule._id}><strong>{rule.title}</strong> {rule.description}</li>
                ))}
              </ul>
```

The `policy-box` wrapper, `policy-title`, guest form, checkbox label (`I have read and agree to the No-Refund Policy`), and `handleNextStep` validation stay exactly as-is.

- [ ] **Step 3: Typecheck and run the full unit suite**

Run: `npx tsc -b`
Expected: PASS with no errors.

Run: `npm test`
Expected: PASS — all suites green (including `bookingService.test.ts` and `venueRulesService.test.ts`).

- [ ] **Step 4: Production build check**

Run: `npm run build`
Expected: PASS — `tsc -b && vite build` completes with no errors.

- [ ] **Step 5: Manual CMS round-trip in local dev (Review Focus: long-text wrap)**

Run: `npm run dev`, then in a second terminal run `npm run dev --prefix dinkresponsibly` to open Sanity Studio. In Studio: (a) add a 4th rule with a 500+ character description, (b) edit the title of rule 1, (c) delete the 4th rule again. After each action, reload the customer booking flow and confirm: Step 4 `Strict Venue Rules` box and the TermsModal policy list both show the same updated list immediately; the 500-char description wraps without breaking layout; the agreement checkbox still blocks Next/Payment when unchecked.
Expected: all three CMS operations reflect on both surfaces; validation behavior unchanged.

- [ ] **Step 6: Commit (local only — do NOT push)**

```bash
git add src/components/customer/TermsModal.tsx
git commit -m "feat: render TermsModal policy list from Sanity venue rules"
```

Do NOT run `git push`. Wait for the user's local-testing go-signal before any push to production.
