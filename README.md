# Saboo Group — CUG Mobile Dashboard

A real-time mobile connection management dashboard built with **Next.js 14**, **Tailwind CSS**, and **Recharts**.

## Features

- **230 connections** across HIC, RKS, and SAZ companies
- Company-wise filtering with live metrics
- **Fancy number classification** — Tier 1 (Premium), Tier 2 (Choice), Tier 3 (Notable)
- Network & plan filters
- Full-text search (name, number, department, location)
- Recharts visualisations (network bar, company donut, tier split)
- Paginated table with colour-coded badges
- Dark theme, fully responsive

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for production

```bash
npm run build
npm start
```

## Project structure

```
src/
  app/
    globals.css       # Tailwind base + custom component classes
    layout.tsx        # Root layout
    page.tsx          # Server component — loads data, renders dashboard
  components/
    Dashboard.tsx     # Main client component with all state/filters
    MetricCard.tsx    # Summary stat card
    TierCard.tsx      # Fancy tier selector card
    ConnectionsTable.tsx  # Paginated table
    Charts.tsx        # Recharts bar + donut charts
  data/
    connections.json  # CUG connection data (230 records)
  lib/
    utils.ts          # Types, fancy-tier logic, colour helpers
```

## Fancy number tiers

| Tier | Criteria |
|------|----------|
| **Tier 1 — Premium** | All same digit, palindrome, pure arithmetic sequence, or 4+ identical tail digits |
| **Tier 2 — Choice** | 3-same tail, 3+ matching digit pairs, or strong repeating pattern |
| **Tier 3 — Notable** | Double ending (e.g. 55, 00), mirrored adjacent pairs |

## Data update

Replace `src/data/connections.json` with a new export in the same format, then redeploy.
