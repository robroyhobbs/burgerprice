# BPI Chart & Links Enhancement Intent

> Make BPI feel like a real financial terminal — clickable restaurant links and candlestick charts push the Bloomberg-for-burgers aesthetic further.

## Responsibilities

- Add restaurant website URLs to DeepSeek price research output
- Hyperlink all restaurant names in hero, city pages, and spotlight sections
- Fall back to Google Maps search link when no website URL available
- Replace the current area trend chart with a candlestick (OHLC) chart
- Candlestick uses: Open=prev week BPI, Close=this week BPI, High=most expensive price, Low=cheapest price
- Classic stock colors: red candle = BPI up (more expensive), green candle = BPI down
- Provide `/api/backfill` endpoint to generate 7 weeks of historical data for new cities

## Non-Goals

- Real-time or intraday data
- Multiple timeframe views (1M/3M/1Y)
- Google/Yelp review scores or ratings
- Changing the BPI calculation formula

## Structure

```
DeepSeek prompt
  └── adds `website` field to RawPrice
        └── stored in raw_prices JSONB (no schema change)

Display components
  ├── CityShowdown (hero) — restaurant names → <a> links
  ├── CityProfile (price table) — restaurant names → <a> links
  ├── BurgerSpotlight — restaurant name → <a> link
  └── CandlestickChart (new) — replaces TrendChart
        ├── Homepage: all cities or national overlay
        └── City page: single city

Backfill endpoint
  └── /api/backfill?cityId=xxx&weeks=7
        └── calls DeepSeek for each week → inserts bpi_snapshots
```

## API

### RawPrice type change
```typescript
interface RawPrice {
  restaurant: string;
  burger: string;
  price: number;
  source: string;
  category: "fast_food" | "casual" | "premium";
  website: string | null;  // NEW — restaurant URL or null
}
```

### Restaurant link helper
```typescript
function getRestaurantUrl(name: string, city: string, state: string, website: string | null): string
// Returns website if valid URL, else Google Maps search fallback
```

### Candlestick data shape
```typescript
interface CandleData {
  week_of: string;
  open: number;    // previous week BPI
  close: number;   // this week BPI
  high: number;    // most expensive burger price
  low: number;     // cheapest burger price
}
```

### Backfill endpoint
```
POST /api/backfill
Headers: Authorization: Bearer $CRON_SECRET
Body: { cityId: string, weeks: number }
Response: { status: "backfilled", weeks_created: number }
```

## Constraints

- No new npm dependencies — Recharts already supports custom bar shapes for candlesticks
- `website` field stored inside existing `raw_prices` JSONB column — no DB migration needed
- Google Maps fallback URL: `https://www.google.com/maps/search/${encodeURIComponent(name + " " + city + " " + state)}`
- Links open in new tab (`target="_blank" rel="noopener noreferrer"`)
- Backfill endpoint protected by same CRON_SECRET as collect endpoint
