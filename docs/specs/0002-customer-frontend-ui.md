# 0002 Customer Front End View Specification

**Date**: 2026-08-09
**Status**: Accepted

## Summary

This specification defines the initial customer facing web interface for DinkResponsibly. It creates a modern visual layout without backend connections to showcase venue offerings, live court booking options, company background, and direct customer support channels. Visitors can browse available courts, pick dates, view dynamic hourly rates, and submit support tickets through a floating button widget.

## Context

DinkResponsibly requires a high impact customer landing view to showcase its four pickleball courts, venue amenities, dynamic hourly rate structure, and guest support features. The front desk and management want a clean view that gives visitors a clear preview of court availability and booking workflows before backend integration is completed. The design must emphasize modern aesthetics, vibrant colors, clear navigation, and mobile accessibility while avoiding generic default templates.

## Requirements

**User stories**:
- As a pickleball player, I want to view the venue layout, pricing, and available courts so that I can decide when to play.
- As a venue guest, I want an interactive date and court selection view so that I can choose a suitable 1-hour slot.
- As a customer with inquiries, I want to reach the owner via email, phone, social media, or a persistent ticket button so that I can get quick assistance.

**Acceptance criteria**:

- **AC-1**: Sticky navigation bar featuring a flexible logo placeholder, live availability link, about us section link, and contact information link.
- **AC-2**: Hero section featuring custom branding text, introductory copy, action buttons, dynamic rate indicator badge (₱400 per hour baseline), and hero imagery card layout.
- **AC-3**: Court availability and booking preview section featuring an interactive date calendar picker card, court selection cards (Court A, Court B, Court C, Court D), and time slot selection grid with hourly pricing tags.
- **AC-4**: About us section describing the venue vision, community values, pickleball culture, and facilities.
- **AC-5**: Contact section displaying direct owner communication channels including Facebook link, phone number, email address, and an embedded message form.
- **AC-6**: Persistent floating round icon at the bottom corner of the viewport that triggers a quick popup ticket submission modal from any section.
- **AC-7**: Full responsive presentation across mobile, tablet, and desktop viewports using modern dark theme aesthetics with lime green and emerald accents.

## Options considered

### Option 1: Modern Dark Theme with Interactive Step Card Flow

A dark mode layout built with deep charcoal backgrounds, neon lime accents, glassmorphic cards, and an interactive multi-step booking preview card.

**Pros**:
- Creates an impressive modern sports aesthetic that appeals to pickleball players.
- Step by step card layout prevents visual clutter and guides guests clearly.

**Cons**:
- Requires custom CSS gradient and glassmorphism styling setup.

### Option 2: Minimalist Light Theme with Side by Side Layout

A traditional light background design displaying calendar selection on the left and court timetables on the right.

**Pros**:
- Simple layout structure with standard white background components.

**Cons**:
- Looks less premium and lacks the high energy feel expected for a modern sports venue.

## Decision

**Chosen option**: Option 1: Modern Dark Theme with Interactive Step Card Flow

We choose the modern dark theme with vibrant lime and emerald accents, paired with an interactive step card layout for booking preview and a persistent floating ticket trigger widget.

**Implementation skills**: `@supabase/supabase-js` (`supabase/supabase-js`, `src/components/admin/AGENTS.md`)

## Rationale

The modern dark theme with lime and emerald accents captures the high energy energy of modern pickleball clubs. Grouping the booking view into interactive step cards allows users to focus on date selection, court picking, and hourly slot choices without overwhelming screen clutter. The persistent floating round ticket icon ensures customer support is accessible regardless of how far down the page a visitor scrolls.

## Feature Design

**Data model sketch**:
```typescript
// Presentational state interface for UI display
interface CourtViewItem {
  id: string;
  name: string; // Court A, Court B, Court C, Court D
  isAvailable: boolean;
  daytimeRate: number; // 400 PHP
  nighttimeRate: number; // 500 PHP
}

interface TimeSlotViewItem {
  timeLabel: string; // e.g. "06:00 AM - 07:00 AM"
  rate: number; // 400 or 500 PHP
  isBooked: boolean;
}
```

**State transitions**:
Navbar links update the active navigation section indicator. The booking card steps transition from Date Selection to Court Selection to Slot Summary. The floating ticket icon toggles the popup modal open and closed.

**API surface**:
| Interface Component | Type | Key Props / Inputs | Key Displays | Auth | Key Behaviors |
|---|---|---|---|---|---|
| CustomerNavbar | Presentational | activeSection (string) | Logo placeholder, Nav links | Public | Smooth scroll to section |
| HeroSection | Presentational | startingRate (number) | Headline, CTA buttons, Badge | Public | Click triggers view courts |
| AvailabilitySection | Presentational | selectedDate (Date), selectedCourt (string) | Calendar card, Court cards, Slot grid | Public | Interactive slot picking view |
| AboutUsSection | Presentational | venueStory (string) | Community story, Venue stats | Public | Informational display |
| ContactSection | Presentational | phone, email, facebook (string) | Contact details, Ticket form | Public | Direct message entry |
| FloatingTicketModal | Interactive | isOpen (boolean) | Name, Email, Subject, Message | Public | Toggle modal visibility |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| View hero section | Baseline hourly rate (₱400/hr) | Business rules in AGENTS.md |
| Pick booking date | Selected calendar date | User selection state |
| Select court | Court A, B, C, or D details | Static court items state |
| Select time slot | Hourly price (₱400 or ₱500) | Dynamic rate rules (Weekdays vs Weekends) |
| Submit support ticket | Ticket reference code preview | Generated client side string |

**Key invariants**:
- The venue always displays four courts (Court A, Court B, Court C, Court D).
- Booking slots enforce strict 1-hour durations.
- Weekday rates reflect ₱400 daytime (6:00 AM to 4:00 PM) and ₱500 nighttime (5:00 PM to 2:00 AM).
- Weekend rates reflect ₱500 flat rate (6:00 AM to 2:00 AM).

**Security model**:
Public view layout with no authentication required for browsing or submitting inquiry tickets.

**Configuration required**:
None required for pure presentational view.

**Critical test scenarios**:
- Happy path: Visitor navigates through Hero, selects date in Availability card, picks Court A, views 1-hour time slots, and opens floating ticket modal (verifies AC-1, AC-2, AC-3, AC-6).
- Mobile responsiveness: Layout stacks smoothly on small viewports with accessible touch targets (verifies AC-7).

## Build Plan

1. Create customer layout shell with sticky navbar, flexible logo placeholder, and navigation anchors, satisfies AC-1.
2. Build Hero Section with custom branding, introductory copy, dynamic rate badge, and visual hero card layout, satisfies AC-2.
3. Implement Availability Section featuring calendar picker card, court selection cards, and 1-hour slot grid with dynamic rate badges, satisfies AC-3.
4. Implement About Us Section with venue story, pickleball culture details, and facility highlights, satisfies AC-4.
5. Build Contact Section displaying phone, email, Facebook link, and direct ticket message form, satisfies AC-5.
6. Create persistent floating round ticket icon widget with slide-up modal trigger, satisfies AC-6.
7. Apply modern dark mode styling with emerald and lime accents and mobile responsiveness across all sections, satisfies AC-7.

## Consequences

**Positive**:
- Provides an immediate visual representation of the front end website layout.
- Establishes a modular component structure ready for backend API integration.
- Delivers a visually striking dark theme tailored for modern sports enthusiasts.

**Negative / tradeoffs**:
- Presentational view uses simulated local state until backend endpoints are wired.

**Neutral**:
- Requires logo image asset replacement when final brand graphics are supplied.

## Follow-up

- Create scope entry in `docs/scope/0002-customer-frontend-ui.md`.
- Implement presentation components under `src/components/customer/`.
