# Burger Price Index: The Bloomberg Terminal of Burgers

## One sentence
A weekly financial-style index tracking burger prices across US cities, starting with Boston vs Seattle, presented with dead-serious data viz and playful burger branding.

## Why?
People love food prices, city comparisons, and absurd-but-real data visualizations. The BPI takes real burger pricing data and presents it like a financial instrument - making it inherently shareable and fun while being genuinely informative about what you're paying for a burger.

## Core Experience

```
User lands on burgerprice.com
         │
         ▼
┌─────────────────────────────────┐
│  BURGER PRICE INDEX   🍔        │
│  ══════════════════════         │
│                                 │
│  ┌─────────┐  VS  ┌─────────┐  │
│  │ BOSTON   │      │ SEATTLE │  │
│  │ $14.37  │      │ $13.82  │  │
│  │ ▲ +2.1% │      │ ▼ -0.8% │  │
│  │ $6-$24  │      │ $5-$22  │  │
│  │ 🏆 Week │      │ 🏆 Week │  │
│  └─────────┘      └─────────┘  │
│                                 │
│  ┌─────────────────────────┐    │
│  │ ~~~~ Trend Chart ~~~~   │    │
│  │ 8-week history          │    │
│  └─────────────────────────┘    │
│                                 │
│  📰 "Smash Burger Surge Hits   │
│      Boston as Beef Futures     │
│      Signal Q1 Volatility"     │
│                                 │
│  📧 Get the Weekly BPI Report  │
│  [email signup]                 │
└─────────────────────────────────┘
         │
         ▼
   User screenshots → shares on social
```

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Next.js    │────▶│   Supabase   │◀────│  DeepSeek    │
│   (Vercel)   │     │  (Postgres)  │     │  AI Research │
│              │     │              │     │  (Weekly)    │
│ - Dashboard  │     │ - BPI scores │     │              │
│ - OG images  │     │ - Prices     │     │ - Scrape     │
│ - API routes │     │ - Reports    │     │ - Analyze    │
│ - Newsletter │     │ - Subs       │     │ - Report     │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Key Decisions

| Question | Choice | Why |
|----------|--------|-----|
| Data source | DeepSeek AI research | Fast to ship, cost-effective for weekly cadence |
| Hero layout | City showdown cards | Head-to-head is engaging and shareable |
| Design tone | 60/40 financial/burger | Credible data + clear burger identity |
| Update freq | Weekly | Sustainable cadence, content rhythm |
| MVP cities | Boston + Seattle | Two expensive food cities, good comparison |
| Sharing | Auto OG images | Zero-effort social cards when link is shared |

## Scope

**In (MVP):** Dashboard, BPI cards, trend chart, market report, burger of the week, OG images, newsletter signup, mobile responsive

**Out:** More cities, user submissions, email delivery, dark mode, map view, restaurant pages, accounts

## Risk + Mitigation

| Risk | Fix |
|------|-----|
| AI price accuracy | Validate ranges, seed with manual data first |
| Stale weekly data | Clear date labeling, "as of" timestamps |
| Low initial content | Backfill 4-6 weeks of seed data |

## Next Steps

1. `/intent-critique` - check for over-engineering
2. `/intent-plan` - generate phased build plan
3. `/intent-build-now` - ship it
