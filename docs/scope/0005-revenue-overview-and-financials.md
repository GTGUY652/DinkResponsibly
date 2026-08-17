# Admin Dashboard: Revenue Overview & Financials

**Workflow:** Beta
**Status:** in-progress

## Feature Scope

Implement the Revenue Overview & Financials module in the Admin Dashboard based on `Revenue Overview.md`. Provides facility owners with real time KPI metrics (Today, Week, Month, YTD), operational unit economics (Average Booking Value, Pending Balances, Refunds), an interactive revenue trend chart with time horizon granularity toggles, and report export tools.

**Done when:** the Admin Dashboard includes a dedicated "Revenue Overview" tab displaying 4 time bound KPI cards with % growth indicators, secondary unit metrics, an interactive revenue trend chart with day/week/month/year toggles, global court/date filters, and CSV report export.

- [x] Design it (spec): [0005](../specs/0005-revenue-overview-and-financials.md)
- [x] Build it: /develop 0005-revenue-overview-and-financials
  - [x] Install `recharts` dependency in `package.json` (satisfies AC-3)
  - [x] Add `fetchRevenueOverviewData()` helper in `bookingService.ts` (satisfies AC-1, AC-2)
  - [x] Create `RevenueOverview.tsx` and `RevenueOverview.css` components (satisfies AC-1, AC-2, AC-3, AC-4)
  - [x] Integrate `Revenue Overview` tab in `AdminDashboard.tsx` (satisfies AC-1)
  - [x] Add unit tests in `bookingService.test.ts` (satisfies AC-1, AC-2)
- [ ] Verify it: /check verify 0005-revenue-overview-and-financials
- [ ] Test it: /test 0005-revenue-overview-and-financials

Spec pointer: `docs/specs/0005-revenue-overview-and-financials.md`
