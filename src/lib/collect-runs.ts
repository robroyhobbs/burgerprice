import { query } from "./db";

/**
 * Every /api/cron/collect run leaves one row here so a "200 but nothing
 * written" collect is visible from /api/health without log access.
 */
const DDL = [
  `CREATE TABLE IF NOT EXISTS collect_runs (
    id               BIGSERIAL PRIMARY KEY,
    week_of          DATE NOT NULL,
    status           TEXT NOT NULL,
    cities_total     INT NOT NULL,
    cities_collected INT NOT NULL,
    cities_existing  INT NOT NULL,
    results          JSONB NOT NULL,
    errors           JSONB NOT NULL DEFAULT '{}'::jsonb,
    duration_ms      INT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

let ensured: Promise<void> | null = null;

function ensureCollectRunsTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      for (const stmt of DDL) await query(stmt);
    })().catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}

export interface CollectRunRecord {
  week_of: string;
  status: string;
  cities_total: number;
  cities_collected: number;
  cities_existing: number;
  results: Record<string, number>;
  errors: Record<string, string>;
  duration_ms: number;
}

/** Best effort: never let bookkeeping break a collect. */
export async function recordCollectRun(run: CollectRunRecord): Promise<void> {
  try {
    await ensureCollectRunsTable();
    await query(
      `INSERT INTO collect_runs
        (week_of, status, cities_total, cities_collected, cities_existing, results, errors, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
      [
        run.week_of,
        run.status,
        run.cities_total,
        run.cities_collected,
        run.cities_existing,
        JSON.stringify(run.results),
        JSON.stringify(run.errors),
        run.duration_ms,
      ],
    );
  } catch (err) {
    console.error("recordCollectRun failed:", err);
  }
}

export interface LastCollectSummary {
  at: string;
  week_of: string;
  status: string;
  cities_collected: number;
  cities_existing: number;
  cities_total: number;
  failed_cities: number;
  duration_ms: number;
  first_error: string | null;
}

/** Short public summary of the latest collect run (no prompts, no secrets). */
export async function getLastCollectRun(): Promise<LastCollectSummary | null> {
  try {
    await ensureCollectRunsTable();
    const res = await query<{
      created_at: Date;
      week_of: string;
      status: string;
      cities_collected: number;
      cities_existing: number;
      cities_total: number;
      errors: Record<string, string>;
      duration_ms: number;
    }>(
      `SELECT created_at, week_of::text AS week_of, status, cities_collected,
              cities_existing, cities_total, errors, duration_ms
         FROM collect_runs ORDER BY created_at DESC LIMIT 1`,
    );
    const row = res.rows[0];
    if (!row) return null;
    const errs = Object.entries(row.errors ?? {});
    return {
      at: new Date(row.created_at).toISOString(),
      week_of: row.week_of,
      status: row.status,
      cities_collected: row.cities_collected,
      cities_existing: row.cities_existing,
      cities_total: row.cities_total,
      failed_cities: errs.length,
      duration_ms: row.duration_ms,
      first_error: errs.length
        ? `${errs[0][0]}: ${sanitize(errs[0][1])}`.slice(0, 160)
        : null,
    };
  } catch {
    return null;
  }
}

function sanitize(msg: string): string {
  return msg
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/Bearer\s+\S+/gi, "Bearer <redacted>")
    .replace(/\s+/g, " ");
}
