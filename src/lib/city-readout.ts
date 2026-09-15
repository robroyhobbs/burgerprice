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
