# Execution Plan: BPI City Expansion

## Overview

Expand BPI from 2 cities (Boston, Seattle) to 10 food cities with individual city pages, a national leaderboard, geolocation "near me", and a city request system.

## Prerequisites

- Supabase project configured with existing schema (cities, bpi_snapshots, etc.)
- DeepSeek API key set on Vercel
- Existing cron at `/api/cron/collect` working
- Current 2-city seed data in Supabase

---

## Phase 0: Database Schema + City Seeding

### Description

Add lat/lng columns to cities table, create city_requests table, and seed the 8 new cities. This is the foundation everything else depends on.

### Tests

#### Happy Path

- [x] Migration adds lat/lng columns to cities table
- [x] Migration creates city_requests table with correct schema
- [x] Existing Boston and Seattle rows get lat/lng populated
- [x] 8 new cities inserted with correct name, state, slug, lat, lng
- [x] Health endpoint reports 10 cities after seeding

#### Bad Path

- [x] Migration is idempotent — running twice doesn't error or duplicate
- [x] Inserting a city with duplicate slug fails gracefully
- [x] city_requests rejects invalid status values (CHECK constraint)
- [x] city_requests enforces UNIQUE(city, state)

#### Edge Cases

- [x] Existing bpi_snapshots for Boston/Seattle unaffected by migration
- [x] Cities with same name but different states handled (Portland OR vs Portland ME)

#### Security

- [x] RLS policy on city_requests: anon can INSERT but not UPDATE/DELETE
- [x] RLS policy on city_requests: anon can SELECT (to show request count)
- [x] Service role can do all operations on city_requests

#### Data Leak

- [x] city_requests does not expose user IP or identifying info
- [x] Error responses from migration don't leak DB credentials

#### Data Damage

- [x] Migration runs in transaction — partial failure rolls back
- [x] Existing city data preserved after ALTER TABLE

### E2E Gate

```bash
# Verify migration applied
curl -s https://burgerprice.com/api/health | jq '.cities'
# Expected: 10

# Verify lat/lng on existing cities
curl -s "https://$SUPABASE_URL/rest/v1/cities?select=name,lat,lng&limit=3" \
  -H "apikey: $ANON_KEY" | jq .
# Expected: lat/lng populated for all

# Verify city_requests table exists
curl -s "https://$SUPABASE_URL/rest/v1/city_requests?select=id&limit=1" \
  -H "apikey: $ANON_KEY"
# Expected: 200 OK (empty array)
```

### Acceptance Criteria

- [ ] All 6 test categories pass
- [ ] 10 cities in database with lat/lng
- [ ] city_requests table created with RLS
- [ ] Migration pushed to Supabase
- [ ] Code committed

---

## Phase 1: Homepage Leaderboard + Showdown Rotation

### Description

Add a BPI leaderboard component to the homepage showing all 10 cities ranked by score. Update the showdown to randomly pick 2 cities based on a seeded hash of the current week date.

### Tests

#### Happy Path

- [ ] Leaderboard renders all 10 cities sorted by BPI score descending
- [ ] Each row shows rank, city name, BPI score, weekly % change with arrow
- [ ] Showdown picks 2 deterministic cities for a given week
- [ ] Same week always produces same 2 cities (seeded random)
- [ ] Different weeks produce different matchups
- [ ] Ticker tape shows data for showdown cities (not all 10)

#### Bad Path

- [ ] Leaderboard renders gracefully when some cities have no snapshots yet
- [ ] Cities with null BPI score show "—" not $0.00 or NaN
- [ ] Showdown handles case where < 2 cities exist

#### Edge Cases

- [ ] All cities have identical BPI score — rank handles ties
- [ ] City with 0% change shows "—" not "0.0%"
- [ ] Leaderboard works with only 2 cities (backward compatible)

#### Security

- [ ] Leaderboard data fetched server-side, no API keys exposed to client

#### Data Leak

- [ ] Raw prices not exposed in leaderboard API response

#### Data Damage

- [ ] Leaderboard is read-only, no mutations possible

### E2E Gate

```bash
# Build and check homepage renders
npm run build 2>&1 | tail -5
# Expected: ✓ Compiled successfully

# Verify leaderboard data available
curl -s https://burgerprice.com/ | grep -c "leaderboard"
# Expected: >= 1

# Verify showdown rotation logic
node -e "
const getShowdownPair = require('./src/lib/showdown').getShowdownPair;
const pair1 = getShowdownPair('2026-02-10', 10);
const pair2 = getShowdownPair('2026-02-10', 10);
const pair3 = getShowdownPair('2026-02-17', 10);
console.assert(pair1[0] === pair2[0], 'Same week same result');
console.assert(pair1[0] !== pair3[0] || pair1[1] !== pair3[1], 'Different weeks differ');
console.log('Showdown rotation OK');
"
```

### Acceptance Criteria

- [ ] All 6 test categories pass
- [ ] Leaderboard visible on homepage below showdown
- [ ] Showdown rotates weekly with deterministic seeding
- [ ] E2E Gate passes
- [ ] Code committed

---

## Phase 2: City Pages + Cities Index

### Description

Create `/cities` index page with search and grid of city cards. Create `/cities/[slug]` dynamic pages with full city profile: BPI hero, trend chart, restaurant price table, national average comparison.

### Tests

#### Happy Path

- [ ] `/cities` renders grid of all 10 city cards with BPI, change, rank
- [ ] `/cities/boston-ma` renders full city profile page
- [ ] City hero shows name, state, BPI score, change %, national rank
- [ ] Restaurant price table populated from raw_prices in latest snapshot
- [ ] National average computed correctly across all cities
- [ ] "vs National Avg" comparison shows percentage above/below
- [ ] Single-city trend chart renders with that city's history
- [ ] Search/filter on `/cities` filters city cards by name

#### Bad Path

- [ ] `/cities/nonexistent-slug` returns 404 page
- [ ] City page renders gracefully when no snapshots exist yet (new city)
- [ ] City with empty raw_prices shows "No price data yet" message
- [ ] Search with no results shows "No cities found" state

#### Edge Cases

- [ ] City page works with only 1 week of history (no trend line, just a dot)
- [ ] Restaurant table handles raw_prices with missing fields gracefully
- [ ] `/cities` page works with 0 cities (shows empty state)
- [ ] Long city names (e.g., "San Francisco") don't break card layout

#### Security

- [ ] City slugs are validated — no path traversal via slug parameter
- [ ] Static generation doesn't expose build-time env vars

#### Data Leak

- [ ] City pages don't expose internal city_id UUIDs in HTML
- [ ] Raw API responses not embedded in page source beyond what's displayed

#### Data Damage

- [ ] City pages are read-only — no mutation endpoints or forms on these pages

### E2E Gate

```bash
# Verify static paths generated
npm run build 2>&1 | grep "/cities"
# Expected: /cities and /cities/[slug] routes listed

# Verify city page renders
curl -s https://burgerprice.com/cities/boston-ma | grep -c "Boston"
# Expected: >= 1

# Verify cities index
curl -s https://burgerprice.com/cities | grep -c "city-card"
# Expected: >= 2

# Verify 404 for bad slug
curl -sI https://burgerprice.com/cities/fake-city | head -1
# Expected: HTTP/2 404
```

### Acceptance Criteria

- [ ] All 6 test categories pass
- [ ] `/cities` index page with search and city cards
- [ ] `/cities/[slug]` pages for all 10 cities
- [ ] 404 for invalid slugs
- [ ] E2E Gate passes
- [ ] Code committed

---

## Phase 3: "Near Me" Geolocation + City Requests

### Description

Add browser geolocation "Find burgers near me" on the cities index page. Client-side distance calculation using city lat/lng data. Add city request API endpoint and form.

### Tests

#### Happy Path

- [ ] "Near Me" button triggers browser geolocation permission prompt
- [ ] After granting permission, nearest tracked city is highlighted/shown
- [ ] Distance to nearest city displayed in miles
- [ ] City request form submits city + state successfully
- [ ] Duplicate request increments request_count (not new row)
- [ ] Request response includes current requestCount and isTracked status
- [ ] Request count shown on UI ("12/25 requests")

#### Bad Path

- [ ] Geolocation denied — show friendly fallback message, no crash
- [ ] Geolocation timeout — show fallback after 5 seconds
- [ ] City request with empty city name returns 400
- [ ] City request with empty state returns 400
- [ ] Requesting an already-tracked city returns { isTracked: true }

#### Edge Cases

- [ ] User exactly equidistant from 2 cities — picks one deterministically
- [ ] User at extreme coordinates (Alaska, Hawaii) — finds nearest continental city
- [ ] City request with leading/trailing whitespace — trimmed before insert
- [ ] City name normalization (case-insensitive matching for duplicates)

#### Security

- [ ] City request API rate-limited (prevent spam flooding)
- [ ] City/state input sanitized — no SQL injection via Supabase client
- [ ] Geolocation only used client-side, coordinates not sent to server
- [ ] City request doesn't accept arbitrary fields (only city, state)

#### Data Leak

- [ ] User's geolocation coordinates never sent to backend or logged
- [ ] City request API response doesn't leak internal IDs or other requests

#### Data Damage

- [ ] Concurrent requests for same city don't create duplicates (UNIQUE constraint)
- [ ] request_count increment is atomic (uses SQL upsert, not read-then-write)

### E2E Gate

```bash
# Verify city request API
curl -s -X POST https://burgerprice.com/api/cities/request \
  -H "Content-Type: application/json" \
  -d '{"city":"Phoenix","state":"AZ"}' | jq .
# Expected: { requestCount: 1, isTracked: false }

# Verify duplicate increments
curl -s -X POST https://burgerprice.com/api/cities/request \
  -H "Content-Type: application/json" \
  -d '{"city":"Phoenix","state":"AZ"}' | jq .requestCount
# Expected: 2

# Verify bad input rejected
curl -sI -X POST https://burgerprice.com/api/cities/request \
  -H "Content-Type: application/json" \
  -d '{"city":"","state":""}' | head -1
# Expected: HTTP/2 400

# Verify tracked city response
curl -s -X POST https://burgerprice.com/api/cities/request \
  -H "Content-Type: application/json" \
  -d '{"city":"Boston","state":"MA"}' | jq .isTracked
# Expected: true
```

### Acceptance Criteria

- [ ] All 6 test categories pass
- [ ] "Near Me" works with browser geolocation
- [ ] City request API functional with upsert logic
- [ ] E2E Gate passes
- [ ] Code committed

---

## Phase 4: Cron Expansion + Revalidation

### Description

Update the weekly cron to collect data for all 10 cities (sequential). After collection, call `revalidatePath()` for updated city pages. Seed initial BPI data for the 8 new cities.

### Tests

#### Happy Path

- [ ] Cron collects BPI data for all 10 cities sequentially
- [ ] Each city gets a new bpi_snapshot row with correct week_of
- [ ] Market report generated with data from all cities
- [ ] Industry news still generated after collection
- [ ] revalidatePath called for each city page after data insert
- [ ] Cron completes within Vercel function timeout (60s for hobby, 300s for pro)

#### Bad Path

- [ ] Cron skips cities that already have data for current week
- [ ] DeepSeek failure for one city doesn't stop collection of remaining cities
- [ ] Cron returns partial results when some cities fail
- [ ] Invalid DeepSeek response (empty prices) handled gracefully

#### Edge Cases

- [ ] First collection for a new city (no previous week to compare)
- [ ] All 10 cities already collected — cron returns all -1 (skipped)
- [ ] Cron runs on a non-Monday (week_of still calculates to Monday)

#### Security

- [ ] Cron endpoint still requires Bearer token authorization
- [ ] CRON_SECRET not logged or exposed in response

#### Data Leak

- [ ] Cron response doesn't include raw prices or DeepSeek prompts
- [ ] Error messages don't expose API keys

#### Data Damage

- [ ] Each city insert is independent — one failure doesn't roll back others
- [ ] Duplicate prevention via week_of + city_id uniqueness check
- [ ] BPI score calculated correctly for cities with different restaurant counts

### E2E Gate

```bash
# Trigger cron manually
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://burgerprice.com/api/cron/collect | jq .
# Expected: { status: "collected", week_of: "...", results: { 10 city entries } }

# Verify snapshots created
curl -s "https://$SUPABASE_URL/rest/v1/bpi_snapshots?select=city_id&week_of=eq.$(date -u +%Y-%m-%d -d 'last monday')" \
  -H "apikey: $ANON_KEY" | jq length
# Expected: 10

# Verify health endpoint
curl -s https://burgerprice.com/api/health | jq .
# Expected: snapshots_count significantly higher
```

### Acceptance Criteria

- [ ] All 6 test categories pass
- [ ] Cron collects for all 10 cities
- [ ] City pages revalidated after collection
- [ ] Seed data created for initial launch
- [ ] E2E Gate passes
- [ ] Code committed and deployed

---

## Final E2E Verification

```bash
# Full system check
curl -s https://burgerprice.com/api/health | jq .
# Expected: 10 cities, growing snapshot count

# Homepage has leaderboard
curl -s https://burgerprice.com/ | grep -c "leaderboard\|rank"

# City pages work
for slug in boston-ma seattle-wa new-york-ny chicago-il austin-tx; do
  status=$(curl -sI "https://burgerprice.com/cities/$slug" | head -1)
  echo "$slug: $status"
done
# Expected: all HTTP/2 200

# Cities index works
curl -s https://burgerprice.com/cities | grep -c "city-card"
# Expected: 10

# City request API works
curl -s -X POST https://burgerprice.com/api/cities/request \
  -H "Content-Type: application/json" \
  -d '{"city":"Denver","state":"CO"}' | jq .requestCount
# Expected: 1
```

## Risk Mitigation

| Risk                               | Mitigation                             | Contingency                              |
| ---------------------------------- | -------------------------------------- | ---------------------------------------- |
| DeepSeek rate limit with 10 cities | Sequential calls with 2s delay between | Reduce to 5 cities, batch remaining      |
| Vercel function timeout on cron    | Monitor execution time, ~15s per city  | Upgrade to Pro or split into 2 cron runs |
| New cities have no historical data | Seed 1 week of data at city creation   | Show "collecting first data..." state    |
| Geolocation denied by user         | Fallback to city search/browse         | Search bar always visible                |

## References

- [Intent](./INTENT.md)
- [Decisions](../decisions-city-expansion.md)
