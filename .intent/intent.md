# Burger Price Index (BPI) - Technical Specification

## 1. Overview

**Product:** The Burger Price Index (burgerprice.com) - a standalone web app that tracks and compares burger prices across US cities, presented as a serious financial index with playful burger branding.

**Core Concept:** Bloomberg Terminal meets hamburger. Real burger price data collected via AI-assisted research, presented weekly as a financial-style index with city-vs-city showdowns, trend charts, market commentary, and shareable OG images.

**Priority:** Ship MVP this week.

**Target User:** Social media users, foodies, and anyone who appreciates the absurdity of treating burger prices like stock prices. Optimized for screenshots and sharing.

**Scope:** MVP covers Boston MA vs Seattle WA. Architecture supports future expansion to additional cities.

---

## 2. Architecture

### System Diagram

```
                    ┌─────────────────────┐
                    │   burgerprice.com    │
                    │   (Next.js/Vercel)   │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
          ┌──────▼──────┐ ┌───▼────┐ ┌──────▼──────┐
          │  Frontend    │ │  API   │ │  OG Image   │
          │  Dashboard   │ │ Routes │ │  Generator  │
          └──────────────┘ └───┬────┘ └─────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     Supabase        │
                    │  (PostgreSQL + Auth) │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Weekly Data Pipeline│
                    │  (DeepSeek AI +     │
                    │   Cron/Manual)      │
                    └─────────────────────┘
```

### Tech Stack

| Layer       | Choice                   | Rationale                                          |
| ----------- | ------------------------ | -------------------------------------------------- |
| Framework   | Next.js 14+ (App Router) | Best for SSR, OG images, API routes, Vercel deploy |
| Styling     | Tailwind CSS             | Fast iteration, responsive, design system friendly |
| Charts      | Recharts or Chart.js     | Financial-style charts, candlestick support        |
| Database    | Supabase (PostgreSQL)    | Free tier, real-time capable, auth for newsletter  |
| AI Research | DeepSeek API             | Cost-effective, good at web research tasks         |
| Hosting     | Vercel                   | Zero-config Next.js deploy, edge functions, cron   |
| OG Images   | @vercel/og (Satori)      | Dynamic social card generation at the edge         |
| Email       | Resend or Supabase       | Newsletter signup + weekly BPI report delivery     |
| Domain      | burgerprice.com          | Already owned                                      |

### Data Layer

**Supabase Tables:**

```sql
-- Cities tracked by the index
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,          -- "Boston"
  state TEXT NOT NULL,         -- "MA"
  slug TEXT UNIQUE NOT NULL,   -- "boston-ma"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly BPI snapshots per city
CREATE TABLE bpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  week_of DATE NOT NULL,           -- Monday of the index week
  bpi_score DECIMAL(6,2) NOT NULL, -- The index number (e.g., 12.47)
  change_pct DECIMAL(5,2),         -- Week-over-week % change
  cheapest_price DECIMAL(6,2),
  cheapest_restaurant TEXT,
  most_expensive_price DECIMAL(6,2),
  most_expensive_restaurant TEXT,
  avg_price DECIMAL(6,2),
  sample_size INTEGER,             -- Number of restaurants surveyed
  raw_prices JSONB,                -- [{restaurant, burger, price, source, category}]
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city_id, week_of)
);

-- Burger of the Week spotlight
CREATE TABLE burger_spotlight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  week_of DATE NOT NULL,
  restaurant_name TEXT NOT NULL,
  burger_name TEXT NOT NULL,
  price DECIMAL(6,2) NOT NULL,
  description TEXT,                -- Why it's the pick
  image_url TEXT,                  -- Optional photo
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city_id, week_of)
);

-- Weekly market commentary
CREATE TABLE market_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of DATE NOT NULL UNIQUE,
  headline TEXT NOT NULL,          -- "Smash Burger Surge Hits Boston"
  summary TEXT NOT NULL,           -- 2-3 paragraph market report
  factors JSONB,                   -- [{factor, impact, description}]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Newsletter subscribers (simplified for MVP - just collect emails)
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- Note: Raw price data stored as JSONB on bpi_snapshots.raw_prices
-- Schema: [{restaurant, burger, price, source, category}]
```

---

## 3. Detailed Behavior

### Weekly Data Pipeline

1. **Trigger:** Cron job (Vercel Cron or manual) runs every Monday
2. **AI Research Phase:**
   - DeepSeek API call with structured prompt requesting current burger prices
   - Prompt specifies: city, restaurant types to check (chains, local spots, delivery apps)
   - Returns structured JSON with restaurant names, burger names, prices, sources
3. **Data Processing:**
   - Parse AI response, validate prices (reject outliers > $50 or < $1)
   - Store raw data in `price_data` table
   - Calculate BPI score: weighted average of all collected prices
   - Calculate week-over-week change %
   - Identify cheapest/most expensive
4. **Report Generation:**
   - DeepSeek generates market commentary based on price changes
   - Tone: real economic factors + humor (e.g., "Cattle futures rose 2.1% this week, putting upward pressure on the Boston BPI. Meanwhile, a new smash burger joint on Newbury St is single-handedly pulling the premium segment higher.")
   - Generate 2-3 "market factors" with real/funny descriptions
5. **Spotlight Selection:**
   - AI picks a "Burger of the Week" per city based on value, uniqueness, or trend
6. **Snapshot Creation:**
   - Insert new `bpi_snapshots`, `burger_spotlight`, and `market_reports` rows

### BPI Score Calculation

```
BPI = Weighted Average of sampled burger prices
  - Fast food: 20% weight
  - Casual/diner: 40% weight
  - Premium/gourmet: 40% weight

Displayed as a dollar figure with 2 decimals (e.g., $14.37)
Change shown as: +2.1% or -0.8% week-over-week
```

### OG Image Generation

Dynamic route: `/api/og?city=boston-ma&week=2026-02-10`

Renders:

- BPI score large and centered
- City name
- Trend arrow (green up / red down)
- Week-over-week change %
- "burgerprice.com" branding
- Burger icon

Uses `@vercel/og` (Satori) for edge-rendered PNG images.

---

## 4. User Experience

### Page Structure

```
burgerprice.com/
├── / (home)                    -- City showdown dashboard (all content here)
├── /about                      -- What is the BPI?
└── /api/
    ├── /api/og                 -- OG image generation
    ├── /api/subscribe          -- Newsletter signup
    └── /api/cron/collect       -- Weekly data collection (protected)
```

### Home Page (`/`)

**Above the fold:**

1. **Header:** "BURGER PRICE INDEX" in bold financial typography. Hamburger icon. Subtle ticker-tape animation.
2. **City Showdown Cards:** Side-by-side Boston vs Seattle
   - Each card shows:
     - City name + state
     - BPI Score (large, bold)
     - Change arrow + percentage (green/red)
     - Price range (cheapest → most expensive)
     - "Burger of the Week" mini-card
   - Winner highlighted with subtle glow/badge

**Below the fold:** 3. **Trend Chart:** 8-12 week line chart showing BPI history for both cities. Financial chart styling (grid lines, axis labels). 4. **Market Report:** This week's headline + summary + factors 5. **Newsletter CTA:** "Get the Weekly BPI Report" email signup 6. **Footer:** About, methodology note, social links

### Design System

**Color Palette:**

- Primary: Deep red (#8B0000) - ketchup
- Secondary: Golden yellow (#DAA520) - mustard/bun
- Accent: Forest green (#228B22) - lettuce/positive trend
- Negative: Bright red (#DC143C) - negative trend
- Background: Off-white (#FAFAF5) - paper/receipt texture
- Dark mode: Charcoal (#1A1A2E) - cast iron grill

**Typography:**

- Headlines: Mono/serif financial font (e.g., "DM Serif Display" or "Playfair Display")
- Data: Monospace for numbers (e.g., "JetBrains Mono" or "IBM Plex Mono")
- Body: Clean sans-serif (e.g., "Inter")

**Visual Elements:**

- Burger icon in header (simple, iconic, not cartoonish)
- Subtle sesame seed dots as background texture
- Chart styling mimics financial terminals (dark grid, bright data lines)
- Cards have slight paper/receipt texture
- Trend arrows: triangular, bold, financial style

---

## 5. Technical Implementation Guide

### Project Structure

```
burger-price-index/
├── .env.local                  # DEEPSEEK_API_KEY, SUPABASE_URL, etc.
├── .intent/                    # This spec
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── public/
│   ├── burger-icon.svg
│   └── og-fallback.png
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with fonts, metadata
│   │   ├── page.tsx            # Home - city showdown dashboard
│   │   ├── about/
│   │   │   └── page.tsx        # About the BPI
│   │   └── api/
│   │       ├── og/
│   │       │   └── route.tsx   # OG image generation
│   │       ├── subscribe/
│   │       │   └── route.ts    # Newsletter signup
│   │       └── cron/
│   │           └── collect/
│   │               └── route.ts # Weekly data collection
│   ├── components/
│   │   ├── ui/                 # Reusable UI primitives
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── trend-arrow.tsx
│   │   │   └── ticker-tape.tsx
│   │   ├── bpi-card.tsx        # City BPI score card
│   │   ├── city-showdown.tsx   # Side-by-side comparison
│   │   ├── trend-chart.tsx     # Historical BPI chart
│   │   ├── market-report.tsx   # Weekly report section
│   │   ├── burger-spotlight.tsx # Burger of the Week
│   │   ├── newsletter-form.tsx # Email signup
│   │   └── header.tsx          # Site header with ticker
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   ├── deepseek.ts         # DeepSeek API wrapper
│   │   ├── bpi.ts              # BPI calculation logic
│   │   └── types.ts            # TypeScript interfaces
│   └── styles/
│       └── globals.css         # Global styles + Tailwind
```

### Key Interfaces

```typescript
interface City {
  id: string;
  name: string;
  state: string;
  slug: string;
}

interface BpiSnapshot {
  id: string;
  cityId: string;
  weekOf: string; // ISO date
  bpiScore: number;
  changePct: number | null;
  cheapestPrice: number;
  cheapestRestaurant: string;
  mostExpensivePrice: number;
  mostExpensiveRestaurant: string;
  avgPrice: number;
  sampleSize: number;
}

interface BurgerSpotlight {
  id: string;
  cityId: string;
  weekOf: string;
  restaurantName: string;
  burgerName: string;
  price: number;
  description: string;
  imageUrl?: string;
}

interface MarketReport {
  id: string;
  weekOf: string;
  headline: string;
  summary: string;
  factors: MarketFactor[];
}

interface MarketFactor {
  factor: string; // "Beef Futures"
  impact: "up" | "down" | "neutral";
  description: string; // "Cattle futures rose 2.1%..."
}

interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
}
```

### DeepSeek Research Prompt Template

```
You are a burger price researcher. Research current burger prices in {city}, {state}.

Find prices from these categories:
- 3-5 fast food chains (McDonald's, Five Guys, Shake Shack, etc.)
- 3-5 casual/diner restaurants
- 3-5 premium/gourmet burger spots

For each, provide:
- Restaurant name
- Burger name (their signature/most popular)
- Price (USD)
- Source (where you found this price)

Also identify:
- One "Burger of the Week" pick (best value or most interesting)
- Any notable price changes or trends

Return as structured JSON.
```

### Market Commentary Prompt Template

```
You are a financial analyst who exclusively covers the burger market.
Write a weekly market report for the Burger Price Index.

Data this week:
- Boston BPI: ${bostonBpi} (${bostonChange}% change)
- Seattle BPI: ${seattleBpi} (${seattleChange}% change)

Write:
1. A punchy headline (like a financial news headline, but about burgers)
2. A 2-3 paragraph market summary mixing real factors (beef prices,
   inflation, seasonality, local events) with humorous burger market
   analysis. Tone: straight-faced financial reporting about burgers.
3. 3 market factors as JSON: [{factor, impact: "up"|"down"|"neutral", description}]

Keep it entertaining but grounded in real economic concepts.
```

---

## 6. Decisions Summary

| Decision         | Choice                            | Rationale                                                    |
| ---------------- | --------------------------------- | ------------------------------------------------------------ |
| Platform         | Standalone site (burgerprice.com) | This IS the product                                          |
| Data source      | DeepSeek AI-assisted research     | Cost-effective, flexible, good enough for weekly cadence     |
| Audience         | Social/viral optimized            | Shareability drives growth                                   |
| Hero layout      | City showdown (Boston vs Seattle) | Head-to-head comparison is inherently engaging               |
| Commentary tone  | Real data + humor                 | Best of both worlds - informative and entertaining           |
| Update frequency | Weekly                            | Manageable cadence, enough for content rhythm                |
| Index type       | Single BPI per city               | Simple, one memorable number per city                        |
| Data points      | Essential + spotlight             | BPI score, change%, range, plus Burger of the Week editorial |
| Design ratio     | 60% financial / 40% burger        | Clearly about burgers but with credible data presentation    |
| Interactivity    | Newsletter signup only            | Keeps MVP simple, builds audience for weekly report          |
| Tech stack       | Next.js + Tailwind + Supabase     | Fast to ship, free tier friendly, great DX                   |
| OG images        | @vercel/og dynamic generation     | Auto-generates shareable cards per city/week                 |
| Hosting          | Vercel                            | Zero-config deploy, cron jobs, edge functions                |

---

## 7. MVP Scope

### Included (Ship This Week)

- Home page with Boston vs Seattle showdown
- BPI score cards with trend arrows
- Historical trend chart (seed with 4-6 weeks of data)
- Weekly market report with factors
- Burger of the Week per city
- Newsletter signup (Supabase)
- Dynamic OG images for social sharing
- Mobile responsive
- DeepSeek-powered data collection pipeline
- About page explaining methodology
- Dark mode (toggle between light/dark themes)
- Seed data for initial launch (backfill a few weeks)

### Excluded (Future Phases)

- Additional cities beyond Boston/Seattle
- User-submitted price data
- Newsletter email delivery (just collect signups for now)
- Interactive map view
- Search/filtering
- Price alerts
- Restaurant detail pages
- User accounts/profiles
- Mobile app
- Embeddable widget

---

## 8. Risks

| Risk                                 | Mitigation                                           |
| ------------------------------------ | ---------------------------------------------------- |
| DeepSeek returns inaccurate prices   | Validate ranges, flag outliers, manual review option |
| Rate limiting on DeepSeek API        | Weekly cadence means low usage; cache results        |
| AI hallucinates restaurants          | Cross-reference with Google Maps data in prompt      |
| Stale data between weekly updates    | Clear "Week of X" dating on all data                 |
| Low initial data quality             | Seed with manually researched data for first 4 weeks |
| OG images look bad on some platforms | Test across Twitter, LinkedIn, iMessage, Slack       |
| Supabase free tier limits            | More than sufficient for MVP traffic levels          |

---

## 9. Open Items

- [ ] Set up Supabase project and create tables
- [ ] Register/configure burgerprice.com DNS → Vercel
- [ ] Decide on newsletter delivery tool (Resend vs defer to Phase 2)
- [ ] Source a good burger icon/logo (SVG)
- [ ] Manually research initial seed data for first 4-6 weeks backfill
