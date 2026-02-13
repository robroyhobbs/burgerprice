# Execution Plan: newsletter

## Overview

Add a weekly newsletter feature to burgerprice.com: DeepSeek generates mockumentary-style market commentary from BPI data, stored in Supabase, displayed on Bloomberg-terminal-styled pages with archive.

## Prerequisites

- Existing DeepSeek integration (`lib/deepseek.ts`)
- Supabase configured with service role key
- Existing cron at `/api/cron/collect`

---

## Phase 0: Supabase Table + DeepSeek Generation Function

### Description

Create the `newsletters` table in Supabase and the `generateNewsletter` function in `lib/deepseek.ts`. Add types to `lib/types.ts`. This phase is backend-only — no pages yet.

### Tests

#### Happy Path

- [x] `generateNewsletter` returns valid JSON with headline + all 6 sections
- [x] Response parses correctly into NewsletterContent type
- [x] Newsletter inserts into Supabase `newsletters` table with correct schema
- [x] `week_of` UNIQUE constraint prevents duplicate editions

#### Bad Path

- [x]Returns null/fallback when DeepSeek returns invalid JSON
- [x]Returns null when DeepSeek returns incomplete sections (missing fields)
- [x]Handles DeepSeek API timeout gracefully (no unhandled promise rejection)
- [x]Insert fails gracefully on duplicate week_of (upsert or skip)

#### Edge Cases

- [x]Handles week with only 1 city having data (minimal input)
- [x]Handles week where all cities have zero change (no movers for The Tape)
- [x]Long city names and restaurant names don't break JSON parsing

#### Security

- [x]DeepSeek prompt does not leak API keys or internal config
- [x]Newsletter content is sanitized before storage (no script injection in jsonb)

#### Data Leak

- [x]Error messages from generation don't expose DeepSeek API details
- [x]Failed generation doesn't log raw API response with sensitive data

#### Data Damage

- [x]Partial DeepSeek response doesn't insert incomplete newsletter
- [x]Table creation is idempotent (CREATE IF NOT EXISTS)

### E2E Gate

```bash
# Verify table exists
curl -s "${SUPABASE_URL}/rest/v1/newsletters?select=id&limit=1" \
  -H "apikey: ${ANON_KEY}" | jq .

# Verify generation function works (called from test script)
npx tsc --noEmit
```

### Acceptance Criteria

- [x]All 6 test categories pass
- [x]`newsletters` table created in Supabase
- [x]`generateNewsletter` function exported from `lib/deepseek.ts`
- [x]Types added to `lib/types.ts`
- [x]Code committed

---

## Phase 1: Newsletter Pages + Bloomberg Terminal UI

### Description

Create `/newsletter` (latest + archive) and `/newsletter/[week_of]` (single edition) pages. Bloomberg terminal visual style: dark background, monospace data, green/red indicators. Add "Newsletter" link to header nav.

### Tests

#### Happy Path

- [x]`/newsletter` page renders latest edition with all 6 sections
- [x]`/newsletter` shows archive list with past edition dates and headlines
- [x]`/newsletter/2026-02-10` renders specific edition by week_of
- [x]Header nav includes "Newsletter" link
- [x]Dark terminal aesthetic: dark bg, monospace font for data sections

#### Bad Path

- [x]`/newsletter` shows "Coming Soon" message when no editions exist
- [x]`/newsletter/invalid-date` returns 404
- [x]`/newsletter/2099-01-01` (future date) returns 404
- [x]Missing sections in jsonb render gracefully (no crash)

#### Edge Cases

- [x]Archive with only 1 edition shows no "past editions" divider
- [x]Very long analyst essay renders without overflow
- [x]The Tape with 10 cities renders in a scrollable/wrapped layout

#### Security

- [x]Newsletter content rendered with proper HTML escaping (no XSS from stored jsonb)
- [x]Dynamic [week_of] route validates date format before querying

#### Data Leak

- [x]Page source doesn't expose Supabase connection details
- [x]Server components don't leak environment variables to client

#### Data Damage

- [x]Reading newsletters is read-only — no mutations from page routes

### E2E Gate

```bash
# Type check
npx tsc --noEmit

# Verify pages build
npx next build 2>&1 | grep -E "(newsletter|error)"

# Verify nav link exists in header
grep -c "Newsletter" src/components/header.tsx
```

### Acceptance Criteria

- [x]All 6 test categories pass
- [x]`/newsletter` page renders with Bloomberg terminal style
- [x]`/newsletter/[week_of]` dynamic route works
- [x]"Newsletter" in header nav
- [x]Code committed

---

## Phase 2: Cron Integration + Backfill

### Description

Add newsletter generation to the weekly cron (after market report step). Retry once on failure. Then backfill the last 4 weeks as a one-time operation.

### Tests

#### Happy Path

- [x]Cron generates newsletter after collecting city data and market report
- [x]Newsletter appears in Supabase after cron completes
- [x]`revalidatePath("/newsletter")` called after newsletter insert
- [x]Backfill script generates editions for last 4 historical weeks

#### Bad Path

- [x]Cron completes successfully even when newsletter generation fails (non-fatal)
- [x]Retry fires once on first failure, then skips on second failure
- [x]Backfill skips weeks that already have newsletters (idempotent)
- [x]Cron doesn't timeout due to newsletter step (stays within 60s budget)

#### Edge Cases

- [x]Cron with 0 collected cities this week skips newsletter (no data to report)
- [x]Backfill with no historical data in Supabase produces 0 editions gracefully
- [x]Concurrent cron runs don't create duplicate newsletters (UNIQUE constraint)

#### Security

- [x]Backfill script uses supabaseAdmin (not anon key) for writes
- [x]Backfill script is not exposed as a permanent API endpoint

#### Data Leak

- [x]Cron logs don't include full newsletter content (only status/week_of)

#### Data Damage

- [x]Newsletter generation failure doesn't roll back market report or city data
- [x]Backfill doesn't overwrite existing editions

### E2E Gate

```bash
# Trigger cron and verify newsletter was created
curl -s -X GET "${BASE_URL}/api/cron/collect" \
  -H "Authorization: Bearer ${CRON_SECRET}" | jq .newsletter_status

# Verify newsletter exists in Supabase
curl -s "${SUPABASE_URL}/rest/v1/newsletters?select=week_of,headline&order=week_of.desc&limit=1" \
  -H "apikey: ${ANON_KEY}" | jq .

# Verify backfill created editions
curl -s "${SUPABASE_URL}/rest/v1/newsletters?select=week_of&order=week_of" \
  -H "apikey: ${ANON_KEY}" | jq 'length'
```

### Acceptance Criteria

- [x]All 6 test categories pass
- [x]Cron generates newsletter automatically
- [x]Retry-once logic works
- [x]4 historical editions backfilled
- [x]Code committed and deployed

---

## Final E2E Verification

```bash
# Full stack check
npx tsc --noEmit
npx next build

# Verify live site
curl -s https://burgerprice.com/newsletter | grep -c "BPI"
curl -s "${SUPABASE_URL}/rest/v1/newsletters?select=week_of&order=week_of" \
  -H "apikey: ${ANON_KEY}" | jq 'length'
```

## Risk Mitigation

| Risk                              | Mitigation                           | Contingency                      |
| --------------------------------- | ------------------------------------ | -------------------------------- |
| DeepSeek returns bad JSON         | Strict JSON parsing with fallback    | Skip newsletter that week        |
| Newsletter adds >10s to cron      | Run generation after response sent   | Move to background job           |
| Mockumentary tone is inconsistent | Detailed system prompt with examples | Manual review first few editions |

## References

- [Intent](./INTENT.md)
- [Decisions](./decisions.md)
