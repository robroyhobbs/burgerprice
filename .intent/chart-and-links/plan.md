# Execution Plan: chart-and-links

## Overview

Two enhancements to make BPI feel like a real financial terminal:
1. Restaurant names become clickable links (DeepSeek provides URLs, Google Maps fallback)
2. Candlestick (OHLC) chart replaces the current area trend chart
3. Backfill API endpoint generates historical data for new cities

## Prerequisites

- DeepSeek API key configured (already done)
- Supabase admin client working (already done)
- Recharts installed (already in deps — supports custom bar shapes for candlesticks)
- 10 cities with at least 1 week of data (already collected)

---

## Phase 0: Restaurant URLs in DeepSeek + Type Update

### Description

Update the DeepSeek `researchBurgerPrices` prompt to also return a `website` field per restaurant. Update the `RawPrice` type to include `website: string | null`. Create the `getRestaurantUrl` helper function. No UI changes in this phase.

### Tests

#### Happy Path
- [ ] DeepSeek prompt includes instruction to return website field
- [ ] RawPrice type includes `website: string | null`
- [ ] `getRestaurantUrl` returns website URL when valid URL provided
- [ ] `getRestaurantUrl` returns Google Maps fallback when website is null
- [ ] `getRestaurantUrl` returns Google Maps fallback when website is empty string

#### Bad Path
- [ ] `getRestaurantUrl` handles website that's not a valid URL (e.g., "unknown")
- [ ] Old raw_prices data without `website` field still works (backward compat)
- [ ] DeepSeek returning no website field defaults to null gracefully

#### Edge Cases
- [ ] Restaurant name with special characters in Google Maps URL is encoded
- [ ] Website with trailing slash handled correctly
- [ ] City/state with spaces encoded properly in fallback URL

#### Security
- [ ] Google Maps fallback URL uses encodeURIComponent (no injection)
- [ ] Website URLs validated as http/https only (no javascript: protocol)

#### Data Leak
- [ ] No API keys or internal data in generated URLs

#### Data Damage
- [ ] Existing bpi_snapshots with old raw_prices format still parse correctly
- [ ] Adding website field doesn't break BPI calculation

### E2E Gate

```bash
# Type check passes
cd /Users/robroyhobbs/work/burger-price-index && npx next build 2>&1 | tail -5

# Verify getRestaurantUrl helper works
node -e "
const { getRestaurantUrl } = require('./src/lib/restaurant-utils');
console.assert(getRestaurantUrl('Test', 'NYC', 'NY', 'https://test.com') === 'https://test.com');
console.assert(getRestaurantUrl('Test', 'NYC', 'NY', null).includes('google.com/maps'));
console.log('PASS');
"
```

### Acceptance Criteria

- [ ] RawPrice type updated with `website` field
- [ ] DeepSeek prompt asks for website URLs
- [ ] `getRestaurantUrl` helper created and exported
- [ ] `next build` succeeds with no type errors
- [ ] Existing data backward compatible

---

## Phase 1: Hyperlink Restaurant Names

### Description

Add clickable links to restaurant names in CityShowdown (hero), CityProfile (price table), and BurgerSpotlight components. Links open in new tab. Use `getRestaurantUrl` helper for URL generation.

### Tests

#### Happy Path
- [ ] CityShowdown hero displays restaurant names as `<a>` tags
- [ ] CityProfile price table displays restaurant names as `<a>` tags
- [ ] BurgerSpotlight displays restaurant name as `<a>` tag
- [ ] Links have `target="_blank" rel="noopener noreferrer"`
- [ ] Links use website URL when available in raw_prices

#### Bad Path
- [ ] Snapshot with no raw_prices still renders (no crash)
- [ ] Restaurant name not found in raw_prices falls back to Google Maps link
- [ ] Null/undefined website field handled gracefully

#### Edge Cases
- [ ] Restaurant names with apostrophes render correctly in links
- [ ] Very long restaurant names don't break layout
- [ ] Cities with no current snapshot show no links (no crash)

#### Security
- [ ] All links use `rel="noopener noreferrer"`
- [ ] No user-controlled content in href without encoding

#### Data Leak
- [ ] Links don't expose internal IDs or API details

#### Data Damage
- [ ] Link addition is display-only, no data mutation

### E2E Gate

```bash
# Build succeeds
cd /Users/robroyhobbs/work/burger-price-index && npx next build 2>&1 | tail -5

# Verify links render in HTML output
curl -s https://burgerprice.com | grep -c 'target="_blank"' || echo "Links found"
```

### Acceptance Criteria

- [ ] All 3 components render restaurant names as hyperlinks
- [ ] Google Maps fallback works for restaurants without website
- [ ] No layout regressions
- [ ] `next build` succeeds

---

## Phase 2: Candlestick Chart

### Description

Create a `CandlestickChart` component using Recharts custom bar shape. Replaces the existing `TrendChart` (AreaChart) on both homepage and city pages. Shows OHLC candles: Open=previous week BPI, Close=this week BPI, High=most expensive burger price, Low=cheapest burger price. Red candle when BPI went up (more expensive), green when BPI went down.

### Tests

#### Happy Path
- [ ] CandlestickChart renders with valid multi-week data
- [ ] Candle body shows Open→Close range (BPI movement)
- [ ] Wicks show High (most expensive) to Low (cheapest) range
- [ ] Red fill when Close > Open (BPI increased)
- [ ] Green fill when Close < Open (BPI decreased)
- [ ] Gray/neutral fill when Close === Open (no change)
- [ ] Homepage renders CandlestickChart instead of TrendChart
- [ ] City page renders CandlestickChart instead of TrendChart

#### Bad Path
- [ ] Single week of data renders one candle (Open = Close for first week)
- [ ] Empty data array renders empty chart with axes
- [ ] Missing cheapest/most_expensive prices handled (wick defaults to body)

#### Edge Cases
- [ ] Week with very wide price spread (wick much taller than body)
- [ ] All weeks same BPI (flat line of neutral candles)
- [ ] Only 2 weeks of data renders correctly
- [ ] Multiple cities on homepage chart each get their own candles

#### Security
- [ ] No XSS via tooltip content (data is numeric)

#### Data Leak
- [ ] Tooltip doesn't expose raw_prices array

#### Data Damage
- [ ] Chart is read-only, no data mutation
- [ ] Original TrendChart file preserved (not deleted) until verified

### E2E Gate

```bash
# Build succeeds with new chart
cd /Users/robroyhobbs/work/burger-price-index && npx next build 2>&1 | tail -5

# Verify old TrendChart import removed from pages
grep -r "TrendChart" src/app/ src/components/ --include="*.tsx" | grep -v "trend-chart.tsx" | grep -v node_modules && echo "WARN: TrendChart still imported" || echo "PASS: TrendChart replaced"
```

### Acceptance Criteria

- [ ] CandlestickChart component created
- [ ] Replaces TrendChart on homepage
- [ ] Replaces TrendChart on city page (via CityProfile)
- [ ] Correct OHLC mapping verified visually
- [ ] Red/green color coding correct
- [ ] `next build` succeeds

---

## Phase 3: Backfill API Endpoint

### Description

Create `POST /api/backfill` endpoint that generates N weeks of historical data for a given city using DeepSeek. Protected by CRON_SECRET. Inserts bpi_snapshots for past weeks to populate candlestick charts.

### Tests

#### Happy Path
- [ ] POST /api/backfill with valid cityId and weeks=7 returns success
- [ ] Creates 7 bpi_snapshots with sequential week_of dates
- [ ] Each snapshot has valid BPI score, extremes, and raw_prices
- [ ] Change percentages calculated between consecutive weeks

#### Bad Path
- [ ] Missing Authorization header returns 401
- [ ] Invalid Bearer token returns 401
- [ ] Non-existent cityId returns 404
- [ ] weeks=0 returns 400
- [ ] weeks > 12 returns 400 (reasonable limit)
- [ ] Non-POST method returns 405 (Next.js handles this)

#### Edge Cases
- [ ] City already has some historical data — backfill only missing weeks
- [ ] Backfill same city twice — skips existing weeks (idempotent)
- [ ] DeepSeek failure for one week doesn't stop remaining weeks

#### Security
- [ ] CRON_SECRET required — no public access
- [ ] cityId validated against cities table (no arbitrary inserts)
- [ ] Rate limited by DeepSeek API calls (inherent)

#### Data Leak
- [ ] Error responses don't expose CRON_SECRET or internal details

#### Data Damage
- [ ] Existing real snapshots never overwritten
- [ ] Backfilled data clearly interleaved by date, not replacing

### E2E Gate

```bash
# Build succeeds
cd /Users/robroyhobbs/work/burger-price-index && npx next build 2>&1 | tail -5

# Test auth protection
curl -s -X POST https://burgerprice.com/api/backfill \
  -H "Content-Type: application/json" \
  -d '{"cityId":"test","weeks":1}' | jq .error
# Expected: "Unauthorized"

# Test with valid auth (local only)
curl -s -X POST http://localhost:3000/api/backfill \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"cityId":"VALID_ID","weeks":2}' | jq .
```

### Acceptance Criteria

- [ ] Endpoint created at /api/backfill
- [ ] Protected by CRON_SECRET
- [ ] Generates historical snapshots via DeepSeek
- [ ] Idempotent (safe to run multiple times)
- [ ] `next build` succeeds

---

## Final E2E Verification

```bash
# Full build
cd /Users/robroyhobbs/work/burger-price-index && npx next build

# Verify deployment
curl -s https://burgerprice.com | grep -c 'candlestick\|target="_blank"'

# Visual check: homepage shows candlestick chart + linked restaurant names
open https://burgerprice.com
```

## Risk Mitigation

| Risk | Mitigation | Contingency |
|------|------------|-------------|
| Recharts candlestick tricky with custom shapes | Use ComposedChart + custom Bar shape (well-documented pattern) | Fall back to bar chart with colored bars |
| DeepSeek returns bad/no website URLs | Google Maps fallback for every restaurant | Always works |
| Backfill DeepSeek calls hit rate limits | 500ms delay between calls, per-week error handling | Partial backfill is OK, run again later |
| Vercel function timeout on backfill | Process one week at a time with early return | Break into smaller batches |

## References

- [Intent](./INTENT.md)
- [Decisions](./decisions.md)
