# Customer Presentation Components

## Stack

- **Language / Framework**: TypeScript, React 19, Lucide React icons
- **Styling**: Modular Component CSS (`CustomerNavbar.css`, `HeroSection.css`, `AvailabilitySection.css`, `AboutUsSection.css`, `ContactSection.css`, `FloatingTicketModal.css`)

## Overview

This folder contains presentational components for the public customer landing page of DinkResponsibly:

- **CustomerNavbar.tsx**: Sticky header with logo placeholder and smooth scroll navigation anchors
- **HeroSection.tsx**: High impact hero section with tagline, starting rate badge (₱400/hr baseline), and CTA buttons
- **AvailabilitySection.tsx**: Interactive calendar date picker, court selection tabs, AM/PM session filter tabs, 1-hour marker grid, straight continuous range selection, and live price summary
- **AboutUsSection.tsx**: Feature cards describing venue mission, community values, facilities, and direct guest checkout
- **ContactSection.tsx**: Venue contact details (phone, email, Facebook link) and direct inquiry message form
- **FloatingTicketModal.tsx**: Persistent round action button at bottom right corner that opens a popup support ticket form

## Rules

- Keep presentational components decoupled from backend API state until Supabase integration.
- Maintain modular component CSS architecture (each `.tsx` component imports its own `.css` file).
- Enforce straight continuous playing hour range selection (no non-consecutive gap selections).

_Drafted by /sync from the introducing change, worth a quick human pass._
