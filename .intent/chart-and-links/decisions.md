# Interview Decisions: BPI Chart & Links Enhancement

> Anchor: Make BPI feel like a real financial terminal — clickable restaurant links and candlestick charts push the Bloomberg-for-burgers aesthetic further.

## Decisions

### 1. Restaurant Links — Scope
- **Question**: Where should restaurant hyperlinks appear?
- **Decision**: Everywhere restaurants are named — hero showdown, city page price tables, spotlight section
- **Rationale**: Most useful and consistent experience

### 2. Restaurant Links — URL Source
- **Question**: How to get restaurant URLs?
- **Decision**: Ask DeepSeek to include website URL in price research. Fallback to Google Maps search link if no URL or URL unknown.
- **Rationale**: Google Maps fallback ensures every restaurant is clickable. No broken links.

### 3. Chart Style
- **Question**: What chart type?
- **Decision**: Candlestick (OHLC) replacing the current area chart everywhere (homepage + city pages)
- **Rationale**: Maximum financial terminal aesthetic. Consistent look across all views.

### 4. Candlestick OHLC Values
- **Question**: What do open/high/low/close represent?
- **Decision**: Open = previous week BPI, Close = this week BPI (body shows week-over-week change). High = most expensive burger in sample, Low = cheapest burger in sample (wicks show price spread).
- **Rationale**: Body captures BPI movement, wicks capture the raw price range. Tall wicks = wide burger price spread.

### 5. Candlestick Colors
- **Question**: Color scheme?
- **Decision**: Classic stock: red = BPI went up (burgers more expensive), green = BPI went down (prices dropped)
- **Rationale**: Traditional financial chart convention. Intuitive for the "Bloomberg Terminal of burgers" brand.

### 6. Data Backfill
- **Question**: How to handle new cities with only 1 week of data?
- **Decision**: API endpoint `/api/backfill` to generate 7 weeks of plausible historical data via DeepSeek. Reusable for future city additions.
- **Rationale**: All cities show full charts immediately. Endpoint is reusable when new cities are added.

### 7. Chart Placement
- **Question**: Where does the candlestick chart live?
- **Decision**: Replaces the current trend chart everywhere — homepage and city pages
- **Rationale**: Consistent look. One chart component to maintain.

## Open Items
- None

## Out of Scope
- Real-time intraday data (we collect weekly only)
- Multiple timeframe views (1M, 3M, 1Y) — could add later
- Restaurant review scores/ratings from Google/Yelp
