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

type SnapshotLike = {
  week_of: string;
  bpi_score: number;
  change_pct: number | null;
};

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
 * Low / high / current across every tracked week. Ties resolve to the most
 * recent week so "fresh high" reads correctly. Needs 3+ valid prints.
 */
export function buildTradingRange(
  history: SnapshotLike[],
): TradingRange | null {
  const prints = (history ?? []).filter(
    (s) => Number.isFinite(s.bpi_score) && s.bpi_score > 0,
  );
  if (prints.length < 3) return null;

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

/** One sentence on where the latest print sits in the full range. */
export function buildTradingRangeStory(
  cityName: string,
  r: TradingRange,
): string {
  const lastIsHigh = r.last.weekOf === r.high.weekOf;
  const lastIsLow = r.last.weekOf === r.low.weekOf;
  const d = new Date(r.firstWeekOf + "T00:00:00");
  const since = Number.isNaN(d.getTime())
    ? r.firstWeekOf
    : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  if (lastIsHigh) {
    return `${cityName} is printing its highest burger since tracking began ${since}. Record territory, and not the fun kind.`;
  }
  if (lastIsLow) {
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
