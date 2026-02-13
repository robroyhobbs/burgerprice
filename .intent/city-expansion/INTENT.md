# BPI City Expansion Intent

> Anchor: Transform BPI from a 2-city dashboard into a city discovery tool where users can find and compare burger prices anywhere in the US.

## Responsibilities

- Expand from 2 cities to 10 curated "food cities"
- Provide individual city profile pages at `/cities/[slug]`
- Show a ranked BPI leaderboard on the homepage
- Rotate the homepage showdown randomly each week
- Offer browser geolocation "near me" to find closest tracked city
- Accept user city requests, flag for manual approval at 25-request threshold
- Collect BPI data for all cities via existing sequential Monday cron

## Non-Goals

- Dedicated restaurant table (use raw_prices from snapshots)
- User accounts or social features
- Third-party review data (Google/Yelp)
- Mobile app
- Parallel/staggered cron collection

## Structure

```
Homepage (/)
├── Header + Ticker (updated for N cities)
├── Weekly Showdown (2 random cities, rotated weekly)
├── BPI Leaderboard (all cities, ranked by score)
├── BPI Trend Chart (top 3-5 cities or user-selected)
├── Market Report
├── Industry News
├── "Find Your City" CTA (geolocation + search)
├── Newsletter Form
└── Footer

City Page (/cities/[slug])
├── City Hero (name, BPI score, change, rank)
├── BPI Trend (single city history)
├── Restaurant Price Table (from raw_prices)
├── Local Factors (from market report)
├── National Average Comparison
└── "Request a City" CTA (if on untracked city)

Cities Index (/cities)
├── Search/filter bar
├── "Near Me" button (geolocation)
└── Grid of city cards (BPI, change, rank)

Request Flow
├── city_requests table (city, state, count, status)
├── Increment on duplicate requests
└── Notify owner at 25 requests for manual approval
```

## API

### New Routes

```typescript
// City profile page — static + on-demand revalidation
GET /cities/[slug]    → CityProfilePage

// Cities index
GET /cities           → CitiesIndexPage

// City request endpoint
POST /api/cities/request
  body: { city: string, state: string, lat?: number, lng?: number }
  response: { requestCount: number, isTracked: boolean }

// No /api/cities/nearest — city coords sent to client, distance calc in browser
// No /api/revalidate — cron calls revalidatePath() directly after collection
```

### Database Changes

```sql
-- Add lat/lng to cities table
ALTER TABLE cities ADD COLUMN lat DECIMAL(9,6);
ALTER TABLE cities ADD COLUMN lng DECIMAL(9,6);

-- Showdown: derived from seeded hash of week_of date, no table needed

-- City requests table
CREATE TABLE city_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  request_count INT DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city, state)
);

```

### Starter Cities (8 new + 2 existing)

| City          | State | Slug             | Lat     | Lng       |
| ------------- | ----- | ---------------- | ------- | --------- |
| Boston        | MA    | boston-ma        | 42.3601 | -71.0589  |
| Seattle       | WA    | seattle-wa       | 47.6062 | -122.3321 |
| New York      | NY    | new-york-ny      | 40.7128 | -74.0060  |
| Los Angeles   | CA    | los-angeles-ca   | 34.0522 | -118.2437 |
| Chicago       | IL    | chicago-il       | 41.8781 | -87.6298  |
| Nashville     | TN    | nashville-tn     | 36.1627 | -86.7816  |
| Austin        | TX    | austin-tx        | 30.2672 | -97.7431  |
| New Orleans   | LA    | new-orleans-la   | 29.9511 | -90.0715  |
| Portland      | OR    | portland-or      | 45.5152 | -122.6784 |
| San Francisco | CA    | san-francisco-ca | 37.7749 | -122.4194 |

## Examples

### Homepage Leaderboard

```
#  City              BPI      Chg
1  San Francisco    $19.42   +2.1% ▲
2  New York         $18.87   -0.4% ▼
3  Boston           $17.96   +0.3% ▲
4  Seattle          $16.14   +1.2% ▲
5  Portland         $15.88   -0.8% ▼
...
```

### City Profile: /cities/austin-tx

```
Austin, TX — BPI $14.52 (#8 nationally, ▲ 1.3%)

Restaurant Prices (This Week):
  P. Terry's Burger         $5.99  (fast_food)
  Hopdoddy Burger Bar      $15.49  (casual)
  Odd Duck                 $22.00  (premium)
  ...

vs National Avg: $16.34 → Austin is 11.1% below average
```

### Near Me Flow

```
1. User clicks "Find burgers near me"
2. Browser prompts for location
3. User at lat=33.44, lng=-112.07 (Phoenix)
4. Phoenix not tracked → show nearest: "Austin, TX (870 mi away)"
5. CTA: "Want Phoenix added? Request it! (12/25 requests so far)"
```

### City Request Flow

```
1. city_requests row for Phoenix, AZ reaches 25
2. Owner notified, manually reviews and approves
3. Approved → new row in cities table, next cron picks it up
```
