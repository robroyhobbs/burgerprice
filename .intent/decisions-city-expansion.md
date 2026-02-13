# Interview Decisions: BPI City Expansion

> Anchor: Transform BPI from a 2-city dashboard into a city discovery tool where users can find and compare burger prices anywhere in the US.

## Decisions

### 1. Core Goal
- **Question**: What's the core goal of this expansion?
- **Decision**: City discovery tool — help people find and compare burger prices anywhere in the US
- **Rationale**: BPI becomes a search/discovery product, not just a static dashboard

### 2. City Count (MVP)
- **Question**: How many cities for MVP?
- **Decision**: Start with 10 curated cities, grow via user requests
- **Rationale**: Enough coverage to be useful, user requests drive growth

### 3. Starter Cities
- **Question**: Which 10 cities?
- **Decision**: Food cities — Boston (existing), Seattle (existing), NYC, LA, Chicago, Nashville, Austin, New Orleans, Portland, San Francisco
- **Rationale**: Cities known for food scenes = more interesting burger data

### 4. New City Requests
- **Question**: How should users request new cities?
- **Decision**: Auto-add at 25 requests threshold
- **Rationale**: Balance between responsiveness and real demand signal

### 5. City Page Content
- **Question**: What does /cities/[slug] show?
- **Decision**: Full city profile — BPI data + restaurant list with prices + local factors + comparison to national average
- **Rationale**: Make each city page a destination worth visiting

### 6. Restaurant Data Source
- **Question**: Where does restaurant list come from?
- **Decision**: Use raw_prices array from BPI snapshots (already collected)
- **Rationale**: Data already exists, no new tables needed for MVP

### 7. Homepage Changes
- **Question**: How does homepage adapt to 10+ cities?
- **Decision**: Keep 2-city showdown + add ranked BPI leaderboard table below
- **Rationale**: Showdown is the fun hook, leaderboard adds depth

### 8. Showdown City Selection
- **Question**: How to pick the featured matchup?
- **Decision**: Random weekly rotation — 2 cities picked randomly each week
- **Rationale**: Variety, every city gets featured eventually

### 9. Leaderboard Columns
- **Question**: What columns in the leaderboard?
- **Decision**: Rank + City + BPI + Change (with arrows)
- **Rationale**: Simple, scannable, financial-ticker aesthetic

### 10. "Near Me" Feature
- **Question**: How does geolocation work?
- **Decision**: Browser Geolocation API — prompt for permission, find nearest tracked city
- **Rationale**: Most accurate, users expect location prompts on discovery tools

### 11. Untracked City Handling
- **Question**: What if user's city isn't tracked?
- **Decision**: Show closest tracked city (with distance note)
- **Rationale**: Always give the user something useful

### 12. Data Collection Scaling
- **Question**: How does the cron handle 10+ cities?
- **Decision**: Sequential, same Monday cron (~2-3 min for 10 cities)
- **Rationale**: Simple, works fine at this scale, no premature optimization

### 13. City Page Rendering
- **Question**: SSR or SSG for city pages?
- **Decision**: Static with on-demand revalidation — rebuild when cron collects new data
- **Rationale**: Fast loads + always fresh after collection

## Open Items
- None

## Out of Scope
- Restaurant table with persistent entries (future iteration)
- User accounts / social features (Untappd-style pivot)
- Restaurant reviews from Google/Yelp
- Mobile app
