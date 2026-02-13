# Interview Decisions: BPI Newsletter

> Anchor: Generate and display weekly mockumentary-style BPI market newsletters on the site, powered by DeepSeek and existing BPI data.

## Decisions

### 1. Generation Trigger
- **Question**: When should the newsletter be generated?
- **Decision**: During the weekly cron, after data collection completes
- **Rationale**: Zero manual work. Newsletter is a natural extension of the data pipeline.

### 2. Page Layout
- **Question**: Latest only, archive, or both?
- **Decision**: Latest edition featured + archive list of past editions. Each has its own URL.
- **Rationale**: Gives visitors a reason to return, and builds SEO-friendly content over time.

### 3. AI Generation Scope
- **Question**: Template sections and fill, or full generation?
- **Decision**: Full generation — one big prompt, DeepSeek writes the entire newsletter
- **Rationale**: Most natural mockumentary voice. Avoids stitched-together feel.

### 4. Failure Handling
- **Question**: What if DeepSeek generation fails during cron?
- **Decision**: Retry once. If still fails, skip that week (non-fatal).
- **Rationale**: Balance between reliability and not blocking the cron pipeline.

### 5. Newsletter Sections
- **Question**: All six sections or trim for MVP?
- **Decision**: All six — Market Overview, The Tape, City Spotlight, Burger of the Week, The Spread, Analyst's Corner
- **Rationale**: Full experience from day one. Data is already available for all sections.

### 6. Navigation
- **Question**: Where to link the newsletter?
- **Decision**: Main nav link (alongside All Cities and About)
- **Rationale**: First-class content deserves first-class visibility.

### 7. Visual Style
- **Question**: What design for the newsletter page?
- **Decision**: Bloomberg terminal style — dark bg, monospace sections, data-heavy
- **Rationale**: Consistent with site's financial parody identity.

### 8. Backfill
- **Question**: Backfill past editions or start fresh?
- **Decision**: Backfill last 4 weeks to seed the archive
- **Rationale**: Small archive gives immediate depth without excessive DeepSeek costs.

## Out of Scope
- Email delivery to subscribers (future feature)
- RSS feed
- Social sharing / OG images per edition
