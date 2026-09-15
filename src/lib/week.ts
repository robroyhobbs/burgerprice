/**
 * Weekly Monday helpers for showdown "fresh print" ritual.
 */

/** Current week's Monday as YYYY-MM-DD. */
export function getCurrentWeekOf(now: Date = new Date()): string {
  // UTC Monday — matches showdown week labels (`T12:00:00Z`); collect's local getMonday can differ near TZ edges, so stale weekOf won't false-positive.
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const day = d.getUTCDay(); // 0 = Sun … 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * True only on UTC Monday when dashboard weekOf equals that Monday
 * (just-dropped print). Tue–Sun stay off even if weekOf is current;
 * stale prior-week data never lights up.
 */
export function isFreshShowdownWeek(
  weekOf: string,
  now: Date = new Date(),
): boolean {
  if (!weekOf) return false;
  if (now.getUTCDay() !== 1) return false;
  return weekOf === getCurrentWeekOf(now);
}
