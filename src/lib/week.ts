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

/** Hour (UTC) on Monday after which the new weekly print is expected (collect runs 10:00 UTC; ~2h grace). */
export const INDEX_EXPECTED_BY_UTC_HOUR = 12;

/**
 * Week the index should be on right now. Before the Monday grace hour the
 * prior Monday is still the expected print, so health doesn't cry stale at
 * 3 AM Monday before the collect job has even fired.
 */
export function getExpectedIndexWeek(now: Date = new Date()): string {
  const current = getCurrentWeekOf(now);
  if (now.getUTCDay() === 1 && now.getUTCHours() < INDEX_EXPECTED_BY_UTC_HOUR) {
    const d = new Date(`${current}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  }
  return current;
}

export interface IndexFreshness {
  expected_week: string;
  index_fresh: boolean;
  weeks_behind: number | null;
}

/** Compare the latest stored print week against the expected week. */
export function getIndexFreshness(
  latestWeek: string | null,
  now: Date = new Date(),
): IndexFreshness {
  const expected = getExpectedIndexWeek(now);
  if (!latestWeek) {
    return { expected_week: expected, index_fresh: false, weeks_behind: null };
  }
  const latest = Date.parse(`${latestWeek.slice(0, 10)}T00:00:00Z`);
  const exp = Date.parse(`${expected}T00:00:00Z`);
  if (Number.isNaN(latest)) {
    return { expected_week: expected, index_fresh: false, weeks_behind: null };
  }
  const weeksBehind = Math.max(0, Math.round((exp - latest) / (7 * 86400000)));
  return {
    expected_week: expected,
    index_fresh: weeksBehind === 0,
    weeks_behind: weeksBehind,
  };
}
