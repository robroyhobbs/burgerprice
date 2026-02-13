# Newsletter Intent

> Anchor: Generate and display weekly mockumentary-style BPI market newsletters on the site, powered by DeepSeek and existing BPI data.

## Responsibilities

- Generate full newsletter prose via DeepSeek after weekly cron data collection
- Store newsletter editions in Supabase `newsletters` table
- Display latest edition at `/newsletter` with archive of past editions
- Retry once on generation failure; skip if retry fails (non-fatal)

## Non-Goals

- Email delivery to subscribers
- RSS feed
- Per-edition OG images or social cards
- User-facing editor or manual content override

## Structure

```
Cron (collect) ──→ All cities collected ──→ generateNewsletter(data)
                                                    │
                                           DeepSeek prompt (full gen)
                                                    │
                                              Parse JSON response
                                                    │
                                           INSERT newsletters table
                                                    │
                                           revalidatePath("/newsletter")

/newsletter (page)
  ├── Latest edition (full render, Bloomberg terminal style)
  └── Archive list (past editions with date + headline)

/newsletter/[week_of] (dynamic page)
  └── Single edition render
```

## API

### Supabase Table: `newsletters`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
week_of     date UNIQUE NOT NULL
headline    text NOT NULL
sections    jsonb NOT NULL   -- { marketOverview, theTape, citySpotlight, burgerOfTheWeek, theSpread, analystsCorner }
created_at  timestamptz DEFAULT now()
```

### DeepSeek Generation

Input: all cities' BPI data, changes, extremes, spotlight for the week.
Output: JSON with `headline` + 6 sections stored in `sections` jsonb column:

| Section           | Content                                              |
| ----------------- | ---------------------------------------------------- |
| `marketOverview`  | 2-3 paragraph weekly summary                         |
| `theTape`         | Top movers with city, direction, change%, commentary |
| `citySpotlight`   | Deep dive on one city (name + narrative)             |
| `burgerOfTheWeek` | Restaurant, burger, city, price, mockumentary review |
| `theSpread`       | Cheapest vs most expensive nationally + commentary   |
| `analystsCorner`  | Titled essay, tongue-in-cheek market analysis        |

## Constraints

- Voice: Bloomberg Financial meets Wendy's Twitter. Deadpan serious. Never break character.
- DeepSeek prompt must specify: "Write as a seasoned financial analyst who covers the burger market with complete sincerity."
- Bloomberg terminal visual: dark bg, monospace data sections, green/red for up/down
- Each edition URL: `/newsletter/[week_of]` (e.g., `/newsletter/2026-02-10`)
- Nav link: "Newsletter" added to header alongside "All Cities" and "About"
- Generation integrated into cron after market report step; retry once on failure
- Backfill last 4 weeks as one-time script (not a permanent endpoint)
