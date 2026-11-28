import {
  buildFourWeekAverage,
  buildPrintStreak,
  formatFourWeekAverage,
  formatPrintStreak,
  selectTrackedPrints,
  type SnapshotLike,
  type StreakDirection,
} from "./city-readout";

/**
 * One city on the /rankings Momentum Board.
 * History is the same tape the city page reads. The board does not
 * recompute the streak or the 4-week average.
 */
export interface MomentumCity {
  slug: string;
  name: string;
  state?: string | null;
  history?: readonly SnapshotLike[] | null;
}

/** One ranked row. Gap is latest print minus the rounded 4-week average. */
export interface MomentumBoardRow {
  rank: number;
  slug: string;
  name: string;
  state: string | null;
  /** Latest tracked print. Same cents the 4-week average uses, when that exists. */
  latest: number | null;
  /** Null below four tracked prints. */
  average: number | null;
  /** Latest minus the 4-week average. Null below four tracked prints. */
  gap: number | null;
  /** Same string the city page prints. Null below two tracked prints. */
  streak: string | null;
  streakDirection: StreakDirection | null;
  /** Consecutive prints in the current run. Flat is 1. Null below two prints. */
  streakLength: number | null;
}

export interface MomentumBoardFaq {
  q: string;
  /** Plain text for the accordion and FAQPage JSON-LD. */
  a: string;
  /** In-page anchor. The accordion links `linkLabel`; JSON-LD stays plain text. */
  href: string;
  linkLabel: string;
}

export const MOMENTUM_BOARD_QUESTION =
  "Which cities have the most Burger Price Index momentum?";

export const MOMENTUM_BOARD_HREF = "#momentum";

export const MOMENTUM_BOARD_LINK_LABEL = "Momentum Board";

/**
 * Signed gap for the board column: "+$1.81", "-$0.17", or "$0.00".
 * Cents, so the label matches the 4-week average's rounded delta.
 */
export function formatMomentumGap(delta: number): string {
  const cents = gapCents(delta);
  const abs = (Math.abs(cents) / 100).toFixed(2);
  if (cents > 0) return `+$${abs}`;
  if (cents < 0) return `-$${abs}`;
  return "$0.00";
}

/**
 * All cities, hottest gap first.
 *
 * Gap is buildFourWeekAverage's delta (latest print minus the 4-week
 * average). Largest positive gap ranks first. Ties break by city name,
 * then slug. A city with fewer than four tracked prints keeps its streak
 * (buildPrintStreak) but has no average or gap, and sorts after every
 * city that has one. Those trailing ties also break by city name.
 * Null when there is nobody to list. First slug wins.
 */
export function buildMomentumBoard(
  cities: readonly MomentumCity[],
): MomentumBoardRow[] | null {
  const seen = new Set<string>();
  const pending: Omit<MomentumBoardRow, "rank">[] = [];

  for (const city of cities) {
    if (!city.slug || seen.has(city.slug)) continue;
    seen.add(city.slug);

    const prints = selectTrackedPrints(city.history);
    const average = buildFourWeekAverage(city.history);
    const streak = buildPrintStreak(city.history);
    const latestPrint = prints.length > 0 ? prints[prints.length - 1] : null;

    pending.push({
      slug: city.slug,
      name: city.name,
      state: city.state ?? null,
      latest: average ? average.latest : (latestPrint?.bpi_score ?? null),
      average: average?.average ?? null,
      gap: average?.delta ?? null,
      streak: streak ? formatPrintStreak(streak) : null,
      streakDirection: streak?.direction ?? null,
      streakLength: streak?.length ?? null,
    });
  }

  if (pending.length === 0) return null;
  pending.sort(compareRows);
  return pending.map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * Rankings FAQ for the accordion and FAQPage JSON-LD.
 * Hottest, coldest, and the longest current streak all come from the
 * board rows, so the sentence cannot drift from the table.
 * Null when nobody has a 4-week average — there is no gap to name.
 * A flat print is not a streak.
 */
export function buildMomentumBoardFaq(
  rows: readonly MomentumBoardRow[] | null,
): MomentumBoardFaq | null {
  if (!rows || rows.length === 0) return null;
  const gapped = rows.filter((row) => row.gap != null);
  if (gapped.length === 0) return null;

  const hottest = extremes(gapped, "max");
  const coldest = extremes(gapped, "min");
  const hotCents = rowGapCents(hottest[0]);
  const coldCents = rowGapCents(coldest[0]);
  if (hotCents == null || coldCents == null) return null;
  const sameGap = hotCents === coldCents;

  let lead: string;
  if (gapped.length === 1) {
    lead = `Only city with a 4-week average, ${namedPrint(gapped[0])}`;
  } else if (sameGap) {
    lead = `Every city with a 4-week average is tied. ${namedPrints(gapped)}`;
  } else {
    lead = `${extremeClause("Hottest", hottest)} ${extremeClause("Coldest", coldest)}`;
  }

  const parts = [lead];
  const streak = longestStreakSentence(rows);
  if (streak) parts.push(streak);
  parts.push(`The tape is on the ${MOMENTUM_BOARD_LINK_LABEL}.`);

  return {
    q: MOMENTUM_BOARD_QUESTION,
    a: parts.join(" "),
    href: MOMENTUM_BOARD_HREF,
    linkLabel: MOMENTUM_BOARD_LINK_LABEL,
  };
}

function extremeClause(label: string, rows: readonly MomentumBoardRow[]): string {
  if (rows.length === 1) return `${label} print, ${namedPrint(rows[0])}`;
  return `${label} prints, tied. ${namedPrints(rows)}`;
}

function namedPrints(rows: readonly MomentumBoardRow[]): string {
  return rows.map((row) => namedPrint(row)).join(" ");
}

/** City name plus the same streak and 4-week sentences the city page uses. */
function namedPrint(row: MomentumBoardRow): string {
  const sentence = momentumSentence(row);
  return sentence ? `${row.name}: ${sentence}` : row.name;
}

function momentumSentence(row: MomentumBoardRow): string {
  const parts: string[] = [];
  if (row.streak) parts.push(`${row.streak}.`);
  if (row.average != null && row.latest != null && row.gap != null) {
    parts.push(
      formatFourWeekAverage({
        average: row.average,
        latest: row.latest,
        delta: row.gap,
      }),
    );
  }
  return parts.join(" ");
}

/**
 * Longest current up or down run. Flat breaks a run and does not win.
 * Ties name every city, grouped by the streak text, city name first.
 */
function longestStreakSentence(rows: readonly MomentumBoardRow[]): string | null {
  const directional = rows.filter(
    (row) =>
      (row.streakDirection === "up" || row.streakDirection === "down") &&
      row.streak != null &&
      row.streakLength != null &&
      row.streakLength > 0,
  );
  if (directional.length === 0) return null;

  const max = Math.max(...directional.map((row) => row.streakLength ?? 0));
  const leaders = directional
    .filter((row) => row.streakLength === max)
    .sort(byName);

  const groups = new Map<string, string[]>();
  for (const row of leaders) {
    const streak = row.streak ?? "";
    const names = groups.get(streak);
    if (names) names.push(row.name);
    else groups.set(streak, [row.name]);
  }

  const parts = [...groups.entries()].map(
    ([streak, names]) => `${joinNames(names)}, ${streak}`,
  );
  if (leaders.length === 1) return `Longest current streak: ${parts[0]}.`;
  return `Longest current streak is tied: ${parts.join("; ")}.`;
}

function extremes(
  rows: readonly MomentumBoardRow[],
  which: "max" | "min",
): MomentumBoardRow[] {
  const cents = rows.map((row) => gapCents(row.gap ?? 0));
  const target = which === "max" ? Math.max(...cents) : Math.min(...cents);
  return rows.filter((row) => gapCents(row.gap ?? 0) === target);
}

function compareRows(
  a: Omit<MomentumBoardRow, "rank">,
  b: Omit<MomentumBoardRow, "rank">,
): number {
  const aHas = a.gap != null;
  const bHas = b.gap != null;
  if (aHas !== bHas) return aHas ? -1 : 1;
  if (a.gap != null && b.gap != null) {
    const byGap = gapCents(b.gap) - gapCents(a.gap);
    if (byGap !== 0) return byGap;
  }
  return byName(a, b);
}

function byName(
  a: { name: string; slug: string },
  b: { name: string; slug: string },
): number {
  const byLabel = a.name.localeCompare(b.name);
  if (byLabel !== 0) return byLabel;
  return a.slug.localeCompare(b.slug);
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function gapCents(delta: number): number {
  return Math.round(delta * 100);
}

function rowGapCents(row: MomentumBoardRow | undefined): number | null {
  if (row?.gap == null) return null;
  return gapCents(row.gap);
}
