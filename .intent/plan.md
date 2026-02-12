# Execution Plan: Burger Price Index (BPI)

## Overview

Build and ship burgerprice.com - a financial-style burger price tracker comparing Boston vs Seattle. The site presents a weekly Burger Price Index with city showdown cards, trend charts, market reports, and shareable OG images. Built with Next.js + Tailwind + Supabase, deployed to Vercel.

**Target:** Ship MVP this week.

## Prerequisites

- Node.js 20+ installed
- Supabase account (free tier)
- DeepSeek API key (provided)
- Vercel account
- burgerprice.com domain (owned)

---

## Phase 0: Project Scaffold + Database + Types

### Description

Bootstrap the Next.js project, configure Tailwind with the BPI design system (colors, fonts, dark mode), set up Supabase client, create database tables, and define all TypeScript interfaces. This phase produces a running dev server with the design system ready and database connected.

### Tests

#### Happy Path
- [ ] `next dev` starts without errors
- [ ] Tailwind classes render correctly (spot check a test div)
- [ ] Supabase client connects and can query `cities` table
- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)
- [ ] Dark mode toggle switches between light/dark themes via class strategy

#### Bad Path
- [ ] App renders error page when SUPABASE_URL is missing (not a crash)
- [ ] App renders error page when SUPABASE_ANON_KEY is missing
- [ ] Supabase query returns empty array (not error) when tables are empty

#### Edge Cases
- [ ] All Google Fonts (DM Serif Display, JetBrains Mono, Inter) load correctly
- [ ] Tailwind custom colors (ketchup, mustard, lettuce) resolve in both light/dark
- [ ] Database UUID generation works (gen_random_uuid)

#### Security
- [ ] `.env.local` is in `.gitignore`
- [ ] Supabase anon key is not exposed in client-side bundle (server components only for DB queries)
- [ ] No API keys in committed code

#### Data Leak
- [ ] Error boundary does not expose Supabase connection string
- [ ] Database error messages are generic to the user

#### Data Damage
- [ ] `UNIQUE(city_id, week_of)` constraint prevents duplicate snapshots
- [ ] `UNIQUE(email)` constraint prevents duplicate subscribers

### E2E Gate

```bash
# Verify dev server starts
cd /Users/robroyhobbs/work/burger-price-index && npm run dev &
sleep 5 && curl -s http://localhost:3000 | grep -q "Burger Price Index" && echo "PASS: Dev server running"

# Verify TypeScript compiles
npx tsc --noEmit && echo "PASS: TypeScript clean"

# Verify Supabase connection
curl -s http://localhost:3000/api/health | jq .status
```

### Acceptance Criteria

- [ ] Next.js 14+ app running with App Router
- [ ] Tailwind configured with BPI color palette + dark mode (class strategy)
- [ ] 3 Google Fonts loaded (DM Serif Display, JetBrains Mono, Inter)
- [ ] Supabase tables created (cities, bpi_snapshots, burger_spotlight, market_reports, subscribers)
- [ ] Boston + Seattle seeded in `cities` table
- [ ] All TypeScript interfaces defined in `src/lib/types.ts`
- [ ] Supabase client helper in `src/lib/supabase.ts`
- [ ] Health check API route at `/api/health`
- [ ] Zero TypeScript errors

---

## Phase 1: Seed Data + BPI Calculation Engine

### Description

Create the BPI calculation logic, the DeepSeek API wrapper, and seed the database with 6 weeks of historical burger price data for both cities. This gives us real data to render in the UI. The seed data can be generated via DeepSeek or hardcoded from manual research. Also build the cron-compatible data collection API route.

### Tests

#### Happy Path
- [ ] `calculateBpi(prices)` returns correct weighted average for mixed-category input
- [ ] `calculateBpi` correctly weights: fast_food 20%, casual 40%, premium 40%
- [ ] Week-over-week change % calculated correctly from two snapshots
- [ ] DeepSeek wrapper returns structured JSON with expected fields
- [ ] `/api/cron/collect` endpoint triggers data collection and inserts new snapshot
- [ ] Seed script inserts 6 weeks of data for Boston and Seattle

#### Bad Path
- [ ] `calculateBpi([])` returns 0 or throws descriptive error for empty array
- [ ] `calculateBpi` rejects prices outside $1-$50 range (outlier filter)
- [ ] DeepSeek wrapper handles API timeout gracefully (returns error, not crash)
- [ ] DeepSeek wrapper handles malformed JSON response
- [ ] `/api/cron/collect` returns 401 when called without CRON_SECRET header
- [ ] Duplicate week insertion is rejected (unique constraint)

#### Edge Cases
- [ ] BPI calculation with only one category (e.g., all fast food)
- [ ] BPI calculation with single price point
- [ ] First week snapshot has null `change_pct` (no prior week)
- [ ] Week boundary: data collected on Sunday vs Monday

#### Security
- [ ] `/api/cron/collect` protected by CRON_SECRET auth header
- [ ] DeepSeek API key only used server-side, never sent to client
- [ ] CRON_SECRET validated with timing-safe comparison

#### Data Leak
- [ ] API error responses don't expose DeepSeek API key
- [ ] Cron endpoint doesn't return raw DeepSeek response to caller

#### Data Damage
- [ ] Partial DeepSeek response doesn't create incomplete snapshot (transaction)
- [ ] Concurrent cron triggers for same week don't create duplicates (upsert or check)
- [ ] Seed script is idempotent (can run multiple times safely)

### E2E Gate

```bash
# Verify seed data exists
curl -s http://localhost:3000/api/health | jq '.cities, .snapshots_count'

# Verify BPI calculation
node -e "
  const { calculateBpi } = require('./src/lib/bpi');
  const result = calculateBpi([
    {price: 8, category: 'fast_food'},
    {price: 14, category: 'casual'},
    {price: 22, category: 'premium'}
  ]);
  console.log('BPI:', result);
  process.exit(result > 0 ? 0 : 1);
"

# Verify 6 weeks of data per city
curl -s 'http://localhost:3000/api/health' | jq '.snapshots_count >= 12'
```

### Acceptance Criteria

- [ ] `src/lib/bpi.ts` with `calculateBpi()` and `calculateChange()` functions
- [ ] `src/lib/deepseek.ts` with `researchBurgerPrices()` and `generateMarketReport()`
- [ ] `/api/cron/collect` route protected by CRON_SECRET
- [ ] Seed script populates 6 weeks of BPI data for both cities
- [ ] 6 weeks of `burger_spotlight` entries per city
- [ ] 6 `market_reports` with headlines, summaries, and factors
- [ ] All tests passing

---

## Phase 2: Dashboard UI - City Showdown + Header

### Description

Build the homepage above-the-fold experience: the "BURGER PRICE INDEX" header with ticker-tape animation, and the Boston vs Seattle city showdown cards. Each card shows BPI score, trend arrow, change %, price range, and Burger of the Week. Winner gets highlighted. This is the hero - the screenshot that gets shared.

### Tests

#### Happy Path
- [ ] Header renders "BURGER PRICE INDEX" with DM Serif Display font
- [ ] Ticker tape animates across the top with recent BPI data
- [ ] Two BPI cards render side-by-side (Boston, Seattle)
- [ ] Each card displays: city name, BPI score, change %, price range
- [ ] Positive change shows green up arrow, negative shows red down arrow
- [ ] Burger of the Week section renders on each card
- [ ] Higher-BPI city gets "winner" visual treatment
- [ ] Dark mode correctly inverts all colors

#### Bad Path
- [ ] Cards render gracefully when snapshot data is missing (loading/empty state)
- [ ] Cards handle null `change_pct` for first week (show "NEW" instead of arrow)
- [ ] Burger spotlight handles missing `image_url` (no broken image)

#### Edge Cases
- [ ] Both cities have identical BPI (tie handling - no winner badge)
- [ ] Very long restaurant names truncate properly
- [ ] Change percentage with many decimal places displays cleanly (round to 1 decimal)
- [ ] Mobile layout stacks cards vertically (responsive breakpoint)

#### Security
- [ ] No database credentials exposed in rendered HTML
- [ ] Server components fetch data - no client-side Supabase calls

#### Data Leak
- [ ] Page source doesn't contain Supabase URL or keys
- [ ] Server-rendered HTML only contains display data

#### Data Damage
- [ ] Read-only page - no mutations possible from the UI

### E2E Gate

```bash
# Verify homepage renders with BPI data
curl -s http://localhost:3000 | grep -q "BPI" && echo "PASS: BPI renders"
curl -s http://localhost:3000 | grep -q "Boston" && echo "PASS: Boston card"
curl -s http://localhost:3000 | grep -q "Seattle" && echo "PASS: Seattle card"

# Verify responsive meta tag
curl -s http://localhost:3000 | grep -q "viewport" && echo "PASS: Responsive"
```

### Acceptance Criteria

- [ ] `src/components/header.tsx` with title + burger icon + ticker tape
- [ ] `src/components/ui/ticker-tape.tsx` with smooth CSS animation
- [ ] `src/components/bpi-card.tsx` with all data points
- [ ] `src/components/ui/trend-arrow.tsx` (green up / red down)
- [ ] `src/components/city-showdown.tsx` composing two BPI cards
- [ ] `src/components/burger-spotlight.tsx` for Burger of the Week
- [ ] Homepage (`src/app/page.tsx`) renders showdown with real data from Supabase
- [ ] Mobile responsive (stacked cards on small screens)
- [ ] Dark mode works for all components
- [ ] Winner city highlighted

---

## Phase 3: Trend Chart + Market Report + Newsletter

### Description

Build the below-the-fold sections: 8-week trend chart comparing both cities (financial chart style), the weekly market report with headline/summary/factors, the newsletter signup form, and the footer. Also build the `/api/subscribe` endpoint and the About page.

### Tests

#### Happy Path
- [ ] Trend chart renders 6+ weeks of data for both cities as line chart
- [ ] Chart has financial styling: grid lines, axis labels, city-colored lines
- [ ] Chart legend identifies Boston vs Seattle lines
- [ ] Market report displays headline in large text
- [ ] Market report summary renders as formatted paragraphs
- [ ] Market factors display with up/down/neutral indicators
- [ ] Newsletter form accepts valid email and shows success message
- [ ] `/api/subscribe` inserts email into subscribers table
- [ ] About page renders methodology explanation
- [ ] Footer has links to About and social placeholders

#### Bad Path
- [ ] Newsletter form rejects invalid email format (client-side validation)
- [ ] `/api/subscribe` returns 400 for invalid email
- [ ] `/api/subscribe` returns 409 for duplicate email (already subscribed)
- [ ] `/api/subscribe` returns 400 for empty body
- [ ] Chart handles missing weeks gracefully (gaps in data)
- [ ] Market report section shows placeholder when no report exists

#### Edge Cases
- [ ] Newsletter form handles very long email addresses
- [ ] Chart with only 1 week of data still renders (single point)
- [ ] Market factors list is empty (no factors section shown)
- [ ] Rapid form double-submit doesn't create duplicates

#### Security
- [ ] Newsletter email is sanitized before DB insert
- [ ] `/api/subscribe` rate-limited (basic: check for rapid submissions)
- [ ] No SQL injection via email field (parameterized query)
- [ ] CSRF protection on subscribe endpoint (origin check)

#### Data Leak
- [ ] Subscribe endpoint doesn't reveal whether email already exists (generic message)
- [ ] Error responses from subscribe don't expose DB details

#### Data Damage
- [ ] Concurrent subscribe calls for same email don't error (idempotent)
- [ ] Malformed email doesn't corrupt subscribers table

### E2E Gate

```bash
# Verify chart data endpoint or rendered chart
curl -s http://localhost:3000 | grep -q "chart\|recharts" && echo "PASS: Chart renders"

# Verify subscribe endpoint
curl -s -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' | jq .

# Verify duplicate subscribe
curl -s -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' | jq .status

# Verify about page
curl -s http://localhost:3000/about | grep -q "methodology\|BPI\|Burger Price Index" && echo "PASS: About page"
```

### Acceptance Criteria

- [ ] `src/components/trend-chart.tsx` with Recharts line chart, financial styling
- [ ] `src/components/market-report.tsx` with headline, summary, factors
- [ ] `src/components/newsletter-form.tsx` with email validation + submit
- [ ] `/api/subscribe` route with validation, dedup, rate limiting
- [ ] `src/app/about/page.tsx` with BPI methodology explanation
- [ ] Footer component with About link
- [ ] Full homepage scrolls: header → showdown → chart → report → newsletter → footer
- [ ] All dark mode compatible

---

## Phase 4: OG Images + SEO + Deploy

### Description

Build the dynamic OG image generator, add comprehensive meta tags for social sharing, configure Vercel deployment, and do final polish. This is the "make it shareable" phase - the OG images are critical for virality. Also set up Vercel Cron for weekly data collection.

### Tests

#### Happy Path
- [ ] `/api/og?city=boston-ma` returns a valid PNG image
- [ ] OG image contains: BPI score, city name, trend arrow, change %
- [ ] OG image has burgerprice.com branding
- [ ] Homepage `<meta>` tags include og:image, og:title, og:description
- [ ] Twitter card meta tags present (twitter:card, twitter:image)
- [ ] `vercel.json` has cron configuration for weekly collection
- [ ] Production build (`next build`) completes with zero errors

#### Bad Path
- [ ] `/api/og` without city param returns fallback image (not 500)
- [ ] `/api/og?city=nonexistent` returns fallback image
- [ ] `/api/og?city=boston-ma&week=invalid-date` returns current week data

#### Edge Cases
- [ ] OG image renders correctly for very high BPI ($99.99)
- [ ] OG image renders correctly for negative change (-15.3%)
- [ ] OG image works when no prior week exists (first week - shows "NEW")

#### Security
- [ ] OG route doesn't accept arbitrary HTML/script injection in params
- [ ] Cron endpoint only accessible with valid CRON_SECRET in production
- [ ] No secrets in vercel.json (use Vercel env vars)

#### Data Leak
- [ ] OG image doesn't expose internal IDs or database info
- [ ] Build output doesn't contain `.env.local` values

#### Data Damage
- [ ] OG generation is read-only (no DB mutations)

### E2E Gate

```bash
# Verify OG image generation
curl -s -o /tmp/og-test.png http://localhost:3000/api/og?city=boston-ma
file /tmp/og-test.png | grep -q "PNG" && echo "PASS: OG image is valid PNG"

# Verify meta tags
curl -s http://localhost:3000 | grep -q 'og:image' && echo "PASS: OG meta tag"
curl -s http://localhost:3000 | grep -q 'twitter:card' && echo "PASS: Twitter card"

# Verify production build
npm run build && echo "PASS: Production build clean"

# Verify cron config
cat vercel.json | jq '.crons' && echo "PASS: Cron configured"
```

### Acceptance Criteria

- [ ] `/api/og/route.tsx` generates dynamic PNG with @vercel/og
- [ ] OG image styled with BPI brand (colors, fonts, burger icon)
- [ ] Root layout has full Open Graph + Twitter Card meta tags
- [ ] `vercel.json` configured with weekly cron for `/api/cron/collect`
- [ ] `next build` passes with zero errors and zero warnings
- [ ] Deployed to Vercel (staging URL works)
- [ ] OG images verified on Twitter Card Validator / OpenGraph debugger
- [ ] Dark mode toggle persists via localStorage

---

## Final E2E Verification

```bash
# Full production build
cd /Users/robroyhobbs/work/burger-price-index
npm run build && echo "BUILD: PASS"

# Start production server
npm start &
sleep 5

# Verify all pages
curl -s http://localhost:3000 | grep -q "Burger Price Index" && echo "HOME: PASS"
curl -s http://localhost:3000/about | grep -q "BPI" && echo "ABOUT: PASS"

# Verify API routes
curl -s http://localhost:3000/api/health | jq .status && echo "HEALTH: PASS"
curl -s -o /tmp/og-final.png http://localhost:3000/api/og?city=boston-ma
file /tmp/og-final.png | grep -q "PNG" && echo "OG IMAGE: PASS"

# Verify subscribe
curl -s -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"final-test@example.com"}' | jq . && echo "SUBSCRIBE: PASS"

# Verify TypeScript
npx tsc --noEmit && echo "TYPES: PASS"

echo "=== ALL E2E CHECKS PASSED ==="
```

## Risk Mitigation

| Risk | Mitigation | Contingency |
|------|------------|-------------|
| DeepSeek returns bad data | Validate price ranges ($1-$50), reject outliers | Use hardcoded seed data, fix pipeline later |
| Supabase free tier rate limits | Cache responses with ISR (revalidate every hour) | Switch to static JSON if needed |
| OG images look wrong on platforms | Test with Twitter Card Validator before launch | Use static fallback OG image |
| Dark mode breaks chart readability | Test chart colors in both themes during Phase 3 | Default to light mode, fix dark later |
| Vercel cron doesn't trigger | Manual fallback: run collection script locally | Add manual trigger button (admin only) |

## Phase Summary

| Phase | Deliverable | Key Files |
|-------|-------------|-----------|
| 0 | Scaffold + DB + Types | project setup, supabase tables, types.ts |
| 1 | Seed Data + BPI Engine | bpi.ts, deepseek.ts, seed script, cron route |
| 2 | Hero UI (Showdown) | header, bpi-card, city-showdown, trend-arrow |
| 3 | Chart + Report + Newsletter | trend-chart, market-report, newsletter, about |
| 4 | OG Images + SEO + Deploy | og route, meta tags, vercel.json, deploy |

## References

- [Intent Specification](./intent.md)
- [Overview](./overview.md)
