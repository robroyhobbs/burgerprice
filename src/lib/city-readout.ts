/**
 * City readout copy — Bloomberg Terminal × Wendy's.
 * THE READ (this week's print) + On the Tape (recent weeks story).
 */

export interface CityReadInput {
  name: string;
  bpi: number | null;
  changePct: number | null;
  rank: number;
  totalCities: number;
  nationalAvg: number | null;
  diffFromNational: number | null;
}

/**
 * Build a single deadpan sentence summarizing the city's BPI print.
 * Returns null when there's nothing useful to say (no BPI yet).
 */
export function buildCityRead(input: CityReadInput): string | null {
  const { name, bpi, changePct, rank, totalCities, nationalAvg, diffFromNational } =
    input;

  if (bpi == null) return null;

  const parts: string[] = [];

  parts.push(`${name} prints $${bpi.toFixed(2)}`);

  if (rank > 0 && totalCities > 0) {
    parts.push(`#${rank} of ${totalCities} on the tape`);
  }

  let sentence = parts.join(", ");

  if (diffFromNational != null && nationalAvg != null) {
    if (diffFromNational === 0) {
      sentence += ` — flat to the national $${nationalAvg.toFixed(2)}`;
    } else if (diffFromNational > 0) {
      sentence += ` — ${diffFromNational}% above the national $${nationalAvg.toFixed(2)}`;
    } else {
      sentence += ` — ${Math.abs(diffFromNational)}% below the national $${nationalAvg.toFixed(2)}`;
    }
  }

  if (changePct != null && changePct !== 0 && !Number.isNaN(changePct)) {
    const abs = Math.abs(changePct).toFixed(1);
    if (changePct > 0) {
      sentence += `, rallying ${abs}% on the week`;
    } else {
      sentence += `, easing ${abs}% on the week`;
    }
  } else if (changePct === 0) {
    sentence += `, unchanged on the week`;
  }

  sentence += ". The drive-thru doesn't care about your feelings.";

  return sentence;
}

/** One week's print for the recent-history strip. */
export interface TapePrint {
  weekOf: string;
  bpi: number;
  /** WoW % vs prior week when known. */
  changePct: number | null;
}

export type SnapshotLike = {
  week_of: string;
  bpi_score: number;
  change_pct: number | null;
};

function weekKey(weekOf: string): string {
  return String(weekOf ?? "").slice(0, 10);
}

/**
 * Valid prints, oldest week first. The trading range and the record check
 * both read this series: finite, positive BPI. Does not mutate history.
 * Ties on a week keep input order, so the later row is the latest print.
 */
export function selectTrackedPrints(
  history: readonly SnapshotLike[] | null | undefined,
): SnapshotLike[] {
  return (history ?? [])
    .filter(
      (s) =>
        Number.isFinite(s.bpi_score) &&
        s.bpi_score > 0 &&
        weekKey(s.week_of).length > 0,
    )
    .sort((a, b) => weekKey(a.week_of).localeCompare(weekKey(b.week_of)));
}

/** Month tracking began, e.g. "Dec 2025". */
export function formatTrackingBegan(weekOf: string): string {
  const day = weekKey(weekOf);
  const d = new Date(`${day}T00:00:00`);
  if (!day || Number.isNaN(d.getTime())) return day || weekOf;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Last N weeks from ascending snapshot history (same series the chart uses).
 * Returns [] when there isn't enough history for a story.
 */
export function sliceRecentTape(
  history: SnapshotLike[],
  limit = 5,
): TapePrint[] {
  if (!history || history.length < 2) return [];
  const slice = history.slice(-Math.max(2, limit));
  return slice.map((s) => ({
    weekOf: s.week_of,
    bpi: s.bpi_score,
    changePct: s.change_pct,
  }));
}

/**
 * One Bloomberg×Wendy's sentence about the multi-week trend.
 */
export function buildTapeStory(
  cityName: string,
  prints: TapePrint[],
): string | null {
  if (prints.length < 2) return null;

  const first = prints[0];
  const last = prints[prints.length - 1];
  if (!(first.bpi > 0) || Number.isNaN(first.bpi) || Number.isNaN(last.bpi)) {
    return null;
  }

  const netPct = Math.round(((last.bpi - first.bpi) / first.bpi) * 1000) / 10;
  const weeks = prints.length;

  let up = 0;
  let down = 0;
  for (let i = 1; i < prints.length; i++) {
    const delta = prints[i].bpi - prints[i - 1].bpi;
    if (delta > 0.005) up++;
    else if (delta < -0.005) down++;
  }

  if (Math.abs(netPct) < 0.15) {
    return `${weeks}-week tape: ${cityName} stuck near $${last.bpi.toFixed(2)} — range-bound at the window, feelings optional.`;
  }

  if (netPct > 0) {
    const green =
      up > 0 ? `, ${up} green print${up === 1 ? "" : "s"}` : "";
    return `${weeks}-week tape: ${cityName} climbed $${first.bpi.toFixed(2)} → $${last.bpi.toFixed(2)} (+${netPct.toFixed(1)}%)${green}. Your wallet filed the complaint; the menu didn't care.`;
  }

  const soft =
    down > 0 ? `, ${down} soft print${down === 1 ? "" : "s"}` : "";
  return `${weeks}-week tape: ${cityName} eased $${first.bpi.toFixed(2)} → $${last.bpi.toFixed(2)} (${netPct.toFixed(1)}%)${soft}. Relief at the window — don't get used to it.`;
}

/** Short week label for the tape strip (e.g. "Jan 5"). */
export function formatTapeWeek(weekOf: string): string {
  const d = new Date(weekOf + "T00:00:00");
  if (Number.isNaN(d.getTime())) return weekOf;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Full-history trading range for a city (Bloomberg-style 52-week range). */
export interface TradingRange {
  low: { weekOf: string; bpi: number };
  high: { weekOf: string; bpi: number };
  last: { weekOf: string; bpi: number };
  firstWeekOf: string;
  weeks: number;
  /** 0 = at the low, 1 = at the high. */
  position: number;
  /** % the latest print sits below the high (>= 0). */
  offHighPct: number;
  /** % the latest print sits above the low (>= 0). */
  offLowPct: number;
}

/**
 * Tracked prints required before the city record FAQ is worth printing.
 * The on-page Trading Range block still waits for three (buildTradingRange's
 * default). Both read the same series.
 */
export const CITY_RECORD_FAQ_MIN_PRINTS = 2;

/**
 * Low / high / current across every tracked week. Ties resolve to the most
 * recent week so "fresh high" reads correctly. Needs `minPrints` valid prints
 * (default 3, the city-page trading range). Uses selectTrackedPrints, the same
 * series classifyRecordPrint reads.
 */
export function buildTradingRange(
  history: readonly SnapshotLike[] | null | undefined,
  minPrints = 3,
): TradingRange | null {
  const prints = selectTrackedPrints(history);
  if (prints.length < minPrints) return null;

  let low = prints[0];
  let high = prints[0];
  for (const s of prints) {
    if (s.bpi_score <= low.bpi_score) low = s;
    if (s.bpi_score >= high.bpi_score) high = s;
  }
  const last = prints[prints.length - 1];
  const span = high.bpi_score - low.bpi_score;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    low: { weekOf: low.week_of, bpi: low.bpi_score },
    high: { weekOf: high.week_of, bpi: high.bpi_score },
    last: { weekOf: last.week_of, bpi: last.bpi_score },
    firstWeekOf: prints[0].week_of,
    weeks: prints.length,
    position: span > 0 ? (last.bpi_score - low.bpi_score) / span : 0.5,
    offHighPct: round1(((high.bpi_score - last.bpi_score) / high.bpi_score) * 100),
    offLowPct: round1(((last.bpi_score - low.bpi_score) / low.bpi_score) * 100),
  };
}

/**
 * Whether the latest print is the range high or low.
 *
 * Same rule as the trading-range sentence: a tie belongs to the most recent
 * week, so a print that merely matches an earlier extreme still counts.
 * A flat tape (high week and low week are the same print) reads as a high.
 * classifyRecordPrint is stricter — a new extreme after eight prior weeks —
 * and does not drive this.
 */
export function tradingRangeExtreme(r: TradingRange): "high" | "low" | null {
  if (r.last.weekOf === r.high.weekOf) return "high";
  if (r.last.weekOf === r.low.weekOf) return "low";
  return null;
}

/** "Nov 16, 2026". Same calendar day as formatTapeWeek, with the year. */
export function formatTapeWeekWithYear(weekOf: string): string {
  const d = new Date(weekOf + "T00:00:00");
  if (Number.isNaN(d.getTime())) return weekOf;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * FAQ answer for the city's record high and low.
 * Null when fewer than two tracked prints — nothing to call a range.
 * Dollars, weeks, and the record sentence all come from buildTradingRange,
 * the same series the Trading Range block renders.
 */
export function buildCityRecordFaqAnswer(
  cityName: string,
  history: readonly SnapshotLike[] | null | undefined,
): string | null {
  const range = buildTradingRange(history, CITY_RECORD_FAQ_MIN_PRINTS);
  if (!range) return null;

  const answer =
    `${cityName}'s record-high BPI is $${range.high.bpi.toFixed(2)} (week of ${formatTapeWeekWithYear(range.high.weekOf)}) ` +
    `and its record low is $${range.low.bpi.toFixed(2)} (week of ${formatTapeWeekWithYear(range.low.weekOf)}), ` +
    `across ${range.weeks} weekly prints since tracking began in ${formatTrackingBegan(range.firstWeekOf)}.`;

  const extreme = tradingRangeExtreme(range);
  if (extreme === "high") {
    return `${answer} This week's $${range.last.bpi.toFixed(2)} is the record high.`;
  }
  if (extreme === "low") {
    return `${answer} This week's $${range.last.bpi.toFixed(2)} is the record low.`;
  }
  return answer;
}

/** One sentence on where the latest print sits in the full range. */
export function buildTradingRangeStory(
  cityName: string,
  r: TradingRange,
): string {
  const since = formatTrackingBegan(r.firstWeekOf);
  const extreme = tradingRangeExtreme(r);
  if (extreme === "high") {
    return `${cityName} is printing its highest burger since tracking began ${since}. Record territory, and not the fun kind.`;
  }
  if (extreme === "low") {
    return `${cityName} is printing its cheapest burger since tracking began ${since}. Rare good news at the window.`;
  }
  if (r.position >= 0.75) {
    return `${cityName} sits ${r.offHighPct.toFixed(1)}% below its ${formatTapeWeek(r.high.weekOf)} high: near the top of its range.`;
  }
  if (r.position <= 0.25) {
    return `${cityName} sits ${r.offLowPct.toFixed(1)}% above its ${formatTapeWeek(r.low.weekOf)} low: near the bottom of its range.`;
  }
  return `${cityName} sits mid-range: ${r.offHighPct.toFixed(1)}% off the high, ${r.offLowPct.toFixed(1)}% above the low.`;
}

/**
 * Prior tracked weeks required before a print can set a record.
 * A new city's first prints are not records.
 */
export const RECORD_MIN_PRIOR_WEEKS = 8;

export interface RecordPrint {
  direction: "high" | "low";
  bpi: number;
  weekOf: string;
  /** Extreme among earlier weeks only. */
  priorExtreme: number;
  priorWeeks: number;
  /** First tracked week in the series. */
  firstWeekOf: string;
}

/**
 * Latest print versus every earlier tracked week.
 *
 * Record high: strictly above the prior max. Record low: strictly below
 * the prior min. A tie with that extreme is not a record. buildTradingRange
 * still lets the latest week win a tie so the city page can call it the
 * high of the range; this helper does not.
 *
 * Needs at least `minPriorWeeks` earlier weeks (default 8). History is the
 * same series the city page trading range uses.
 */
export function classifyRecordPrint(
  history: readonly SnapshotLike[] | null | undefined,
  minPriorWeeks = RECORD_MIN_PRIOR_WEEKS,
): RecordPrint | null {
  const prints = selectTrackedPrints(history);
  if (prints.length === 0) return null;

  const last = prints[prints.length - 1];
  const lastWeek = weekKey(last.week_of);
  const prior = prints.filter((s) => weekKey(s.week_of) < lastWeek);
  const priorWeeks = new Set(prior.map((s) => weekKey(s.week_of))).size;
  if (prior.length === 0 || priorWeeks < minPriorWeeks) return null;

  let priorMax = prior[0].bpi_score;
  let priorMin = prior[0].bpi_score;
  for (const s of prior) {
    if (s.bpi_score > priorMax) priorMax = s.bpi_score;
    if (s.bpi_score < priorMin) priorMin = s.bpi_score;
  }

  const firstWeekOf = prints[0].week_of;
  if (last.bpi_score > priorMax) {
    return {
      direction: "high",
      bpi: last.bpi_score,
      weekOf: last.week_of,
      priorExtreme: priorMax,
      priorWeeks,
      firstWeekOf,
    };
  }
  if (last.bpi_score < priorMin) {
    return {
      direction: "low",
      bpi: last.bpi_score,
      weekOf: last.week_of,
      priorExtreme: priorMin,
      priorWeeks,
      firstWeekOf,
    };
  }
  return null;
}

export interface CityRecordPrint {
  slug: string;
  name: string;
  state: string;
  direction: "high" | "low";
  bpi: number;
  weekOf: string;
  priorExtreme: number;
  /** "Dec 2025" */
  sinceLabel: string;
}

export interface RecordCityInput {
  city: { slug: string; name: string; state: string };
  history: readonly SnapshotLike[] | null | undefined;
}

/**
 * Cities whose own latest print is a record on the newest week in the set.
 * A record from an older week stays off this board. Highs are priciest
 * first; lows are cheapest first.
 */
export function findRecordPrints(cities: readonly RecordCityInput[]): {
  highs: CityRecordPrint[];
  lows: CityRecordPrint[];
} {
  let latest = "";
  for (const city of cities) {
    for (const snap of selectTrackedPrints(city.history)) {
      const week = weekKey(snap.week_of);
      if (week > latest) latest = week;
    }
  }

  const highs: CityRecordPrint[] = [];
  const lows: CityRecordPrint[] = [];
  for (const city of cities) {
    const record = classifyRecordPrint(city.history);
    if (!record || weekKey(record.weekOf) !== latest) continue;
    const item: CityRecordPrint = {
      slug: city.city.slug,
      name: city.city.name,
      state: city.city.state,
      direction: record.direction,
      bpi: record.bpi,
      weekOf: record.weekOf,
      priorExtreme: record.priorExtreme,
      sinceLabel: formatTrackingBegan(record.firstWeekOf),
    };
    if (record.direction === "high") highs.push(item);
    else lows.push(item);
  }

  const byName = (a: CityRecordPrint, b: CityRecordPrint) =>
    a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug);
  highs.sort((a, b) => b.bpi - a.bpi || byName(a, b));
  lows.sort((a, b) => a.bpi - b.bpi || byName(a, b));
  return { highs, lows };
}

/**
 * Records set on one edition week. Prints after `weekOf` are dropped, then
 * findRecordPrints runs on what's left, so an archived issue never sees a
 * later week. If nobody printed on `weekOf`, the newest week left is earlier
 * and those records are dropped — this issue only reports its own week.
 */
export function findRecordPrintsForWeek(
  cities: readonly RecordCityInput[],
  weekOf: string,
): { highs: CityRecordPrint[]; lows: CityRecordPrint[] } {
  const week = weekKey(weekOf);
  const { highs, lows } = findRecordPrints(
    cities.map((city) => ({
      city: city.city,
      history: (city.history ?? []).filter(
        (snap) => weekKey(snap.week_of) <= week,
      ),
    })),
  );
  return {
    highs: highs.filter((item) => weekKey(item.weekOf) === week),
    lows: lows.filter((item) => weekKey(item.weekOf) === week),
  };
}

export type RecordPrintToken =
  | { type: "text"; text: string }
  | { type: "city"; slug: string; name: string };

/**
 * One callout line. Null when there is nothing to say.
 * Cities stay in the order given (findRecordPrints already sorted them).
 * A shared tracking-began month is stated once; different months stay
 * next to their city.
 */
export function recordPrintTokens(
  direction: "high" | "low",
  cities: readonly Pick<CityRecordPrint, "slug" | "name" | "bpi" | "sinceLabel">[],
): RecordPrintToken[] | null {
  if (cities.length === 0) return null;

  const phrase = direction === "high" ? "highest" : "lowest";
  const label = direction === "high" ? "Record high: " : "Record low: ";
  const sameSince = cities.every((c) => c.sinceLabel === cities[0].sinceLabel);
  const tokens: RecordPrintToken[] = [];
  const pushText = (text: string) => {
    const prev = tokens[tokens.length - 1];
    if (prev && prev.type === "text") prev.text += text;
    else tokens.push({ type: "text", text });
  };

  pushText(label);
  cities.forEach((city, i) => {
    if (i > 0) pushText(", ");
    tokens.push({ type: "city", slug: city.slug, name: city.name });
    const price = `$${city.bpi.toFixed(2)}`;
    if (sameSince) {
      pushText(`, ${price}`);
    } else {
      pushText(
        `, ${price}, ${phrase} print since tracking began (${city.sinceLabel})`,
      );
    }
  });

  if (sameSince) {
    const plural = cities.length === 1 ? "print" : "prints";
    pushText(`, ${phrase} ${plural} since tracking began (${cities[0].sinceLabel}).`);
  } else {
    pushText(".");
  }
  return tokens;
}

/** Plain-text form of recordPrintTokens, for tests and captions. */
export function formatRecordPrintLine(
  direction: "high" | "low",
  cities: readonly Pick<CityRecordPrint, "slug" | "name" | "bpi" | "sinceLabel">[],
): string | null {
  const tokens = recordPrintTokens(direction, cities);
  if (!tokens) return null;
  return tokens
    .map((token) => (token.type === "text" ? token.text : token.name))
    .join("");
}

type RecordWatchCities = {
  highs: readonly Pick<CityRecordPrint, "slug" | "name" | "bpi" | "sinceLabel">[];
  lows: readonly Pick<CityRecordPrint, "slug" | "name" | "bpi" | "sinceLabel">[];
};

/**
 * Plain text of the high line, then the low line. Same sentences as
 * /rankings. Null when that week set no record.
 */
export function formatRecordWatchCopy(records: RecordWatchCities): string | null {
  const lines = [
    formatRecordPrintLine("high", records.highs),
    formatRecordPrintLine("low", records.lows),
  ].filter((line): line is string => line != null);
  return lines.length > 0 ? lines.join(" ") : null;
}

export const RECORD_WATCH_FAQ_QUESTION =
  "Which cities set a record high or low this week?";

/** Homepage FAQ entry. Null when formatRecordWatchCopy has nothing to say. */
export function buildRecordWatchFaq(
  records: RecordWatchCities,
): { q: string; a: string } | null {
  const a = formatRecordWatchCopy(records);
  if (!a) return null;
  return { q: RECORD_WATCH_FAQ_QUESTION, a };
}
