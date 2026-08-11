# 0005. Admin Dashboard Revenue Overview & Financials Module

**Date**: 2026-08-10
**Status**: Accepted

## Summary

This specification defines the architecture, data aggregation models, visual charts, and filtering controls for the Revenue Overview and Financials module in the Admin Dashboard. The system provides facility owners with key financial metrics (Today, Week, Month, YTD), unit economics (Average Booking Value, Pending Balances, Refunds), interactive trend charts, and CSV report export.

## Context

Facility managers and court owners require immediate visibility into business performance and revenue growth trends. Without an aggregated financial dashboard, tracking daily earnings, comparing period-over-period growth, and analyzing peak playing hours requires manual calculation. This module unifies revenue data from `public.bookings` and `public.payments` into a centralized dashboard view.

## Requirements

**User stories**:
- As a Facility Owner, I want to see top-level revenue indicators (Today, Week, Month, YTD) so that I can monitor daily income and growth targets.
- As a Facility Owner, I want an interactive revenue trend chart with granularity toggles (Day, Week, Month, Year) so that I can identify peak revenue periods.
- As a Facility Staff member, I want to export revenue reports to CSV so that I can conduct offline accounting and financial auditing.

**Acceptance criteria**:
- **AC-1**: Top KPI row displays 4 metric cards (Today's Revenue, This Week's Revenue, This Month's Revenue, Year-to-Date Revenue) with period-over-period % growth indicators.
- **AC-2**: Sub-header metrics band displays Average Booking Value (ABV = Total Revenue / Completed Bookings), Outstanding Pending Balances, and Refunds & Adjustments.
- **AC-3**: Interactive Revenue Trend Chart renders using Recharts with granularity controls (`[ Day ]`, `[ Week ]`, `[ Month ]`, `[ Year ]`) and interactive hover tooltips.
- **AC-4**: Toolbar controls provide preset date range filters (`Today`, `Last 7 Days`, `This Month`, `Custom`), Court Group filtering (`All Courts`, `Court A`, etc.), and a CSV Export button.

## Options considered

### Option 1: Recharts with Direct Supabase SQL Aggregations (Chosen)

Integrate Recharts for chart rendering and add helper functions in `src/services/bookingService.ts` to compute KPI aggregates directly from Supabase tables (`public.bookings` and `public.payments`).

**Pros**:
- Lightweight, fast component rendering tailored for React 19.
- No database migration needed; queries existing schema directly.

**Cons**:
- Requires client-side grouping for custom date ranges.

### Option 2: Server-Side PostgreSQL Database Views

Create a database view `v_revenue_metrics` in Supabase to pre-calculate all aggregates server-side.

**Pros**:
- Reduces client JS computation.

**Cons**:
- Harder to customize with dynamic user date range pickers.

## Decision

**Chosen option**: Option 1: Recharts with Direct Supabase SQL Aggregations

## Rationale

Option 1 provides maximum flexibility for real-time date filtering and court group selection without locking analytics into rigid database views. Recharts is the standard lightweight React charting library for Vite applications.

## Feature design

**Data model sketch**:
Uses existing tables:
- `public.bookings` (`id`, `total_price`, `booking_date`, `created_at`, `status`, `court_id`)
- `public.payments` (`id`, `booking_id`, `amount`, `status`, `created_at`)

**API surface**:
Queries performed via `@supabase/supabase-js` in `src/services/bookingService.ts`:
- `fetchRevenueOverviewData(dateRange, courtId)` returns aggregated metrics:
  - `todayRevenue`, `todayGrowthPct`
  - `weekRevenue`, `weekGrowthPct`
  - `monthRevenue`, `monthProgressPct`
  - `ytdRevenue`, `ytdGrowthPct`
  - `abv`, `pendingBalance`, `refundsTotal`
  - `trendChartData`: array of `{ label: string, revenue: number }`

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Load Revenue Dashboard | KPI Cards (Today, Week, Month, YTD) | Sum of `bookings.total_price` filtered by date ranges |
| Calculate ABV | Average Booking Value | `Total Revenue / COUNT(bookings)` |
| Render Trend Chart | Daily/Monthly bar heights | Aggregated sum grouped by day/week/month |
| Export CSV | Downloadable report file | Transformed JSON array of active metrics |

**Critical test scenarios**:
- Happy path: Opening Revenue Overview tab displays KPI cards and interactive trend chart, verifies **AC-1**, **AC-3**.
- Filter scenario: Selecting specific Court or Date range re-calculates metrics and updates chart, verifies **AC-4**.
- CSV export: Clicking Export CSV triggers browser file download, verifies **AC-4**.

## Build plan

1. Install `recharts` dependency in `package.json`, satisfies **AC-3**
2. Add `fetchRevenueOverviewData()` helper in `src/services/bookingService.ts` to compute KPI metrics and trend data, satisfies **AC-1**, **AC-2**
3. Create `RevenueOverview.tsx` and `RevenueOverview.css` components with KPI cards, sub-header metrics, Recharts trend graph, and global controls, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**
4. Integrate `RevenueOverview` tab into `AdminDashboard.tsx` navigation header, satisfies **AC-1**
5. Add unit tests for `fetchRevenueOverviewData()` in `bookingService.test.ts`, satisfies **AC-1**, **AC-2**

## Consequences

**Positive**:
- Facility owners get instant, visual clarity on facility financial health.
- Easy export for offline bookkeeping.

**Negative / tradeoffs**:
- Adds `recharts` package to bundle size (~30kB gzipped).
