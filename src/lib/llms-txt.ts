/**
 * Plain-text lines for /llms.txt.
 * National dollars come from getNationalBpiHistory (the homepage card).
 * Rank matches /rankings and buildRankLadder: #1 is the priciest city.
 * Range and records use the city-page trading-range helpers.
 * Movers use each city's stored week-over-week change, the same figure
 * the homepage Biggest Movers board ranks.
 */

import {
  buildTradingRange,
  classifyRecordPrint,
  findRecordPrintsForWeek,
  type RecordCityInput,
  type SnapshotLike,
} from "./city-readout";
import { buildRankLadder } from "./rank-ladder";
import type { CityDashboardData } from "./types";

/** YYYY-MM-DD from a week stamp. Null when the value is not a date. */
export function weekStamp(weekOf: string | null | undefined): string | null {
  const day = String(weekOf ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function money(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? `$${n.toFixed(2)}` : "n/a";
}

function pct(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "no prior week";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}% week over week`;
}

export interface NationalHistoryPoint {
  week_of: string;
  avg_bpi: number;
}

export interface NationalCityPrint {
  name: string;
  state: string;
  slug: string;
  bpi: number | null;
  weekOf: string | null;
}

function cityLabel(city: Pick<NationalCityPrint, "name" | "state">): string {
  const state = city.state.trim();
  return state ? `${city.name}, ${state}` : city.name;
}

/** Finite national prints, oldest week first. One row per history entry. */
function trackedNationalPoints(
  history: readonly NationalHistoryPoint[],
): NationalHistoryPoint[] {
  return history
    .filter(
      (point) =>
        Number.isFinite(point.avg_bpi) && weekStamp(point.week_of) != null,
    )
    .sort((a, b) => weekStamp(a.week_of)!.localeCompare(weekStamp(b.week_of)!));
}

/**
 * National BPI line for the latest week in `history`.
 *
 * `history` is getNationalBpiHistory: one average per week, same series as
 * the homepage national card. WoW is that card's formula, (current − prior)
 * / prior, not a second average. Cheapest and priciest are current prints
 * on that same week. Missing pieces are left off the line. Null when there
 * is no national print.
 */
export function formatNationalBpiLine(
  history: readonly NationalHistoryPoint[],
  cities: readonly NationalCityPrint[],
): string | null {
  const points = trackedNationalPoints(history);
  if (points.length === 0) return null;

  const current = points[points.length - 1];
  const previous = points.length >= 2 ? points[points.length - 2] : null;
  const week = weekStamp(current.week_of)!;
  // Same WoW as the homepage national card (page.tsx nationalChangePct).
  const changePct =
    previous && previous.avg_bpi > 0
      ? ((current.avg_bpi - previous.avg_bpi) / previous.avg_bpi) * 100
      : null;
  const wow =
    changePct != null && Number.isFinite(changePct)
      ? ` (${pct(changePct)})`
      : "";

  const onWeek = cities
    .filter(
      (city) =>
        city.bpi != null &&
        Number.isFinite(city.bpi) &&
        weekStamp(city.weekOf) === week,
    )
    .sort(
      (a, b) =>
        (a.bpi as number) - (b.bpi as number) ||
        a.name.localeCompare(b.name) ||
        a.slug.localeCompare(b.slug),
    );

  const sentences = [
    `National BPI: ${money(current.avg_bpi)} for the week of ${week}${wow}.`,
  ];
  if (onWeek.length > 0) {
    const cheapest = cityLabel(onWeek[0]);
    const priciest = cityLabel(onWeek[onWeek.length - 1]);
    if (cheapest === priciest) {
      sentences.push(`Cheapest and priciest city this week: ${cheapest}.`);
    } else {
      sentences.push(`Cheapest city this week: ${cheapest}.`);
      sentences.push(`Priciest city this week: ${priciest}.`);
    }
  }
  return sentences.join(" ");
}

export interface MoverCityPrint {
  name: string;
  state: string;
  slug?: string;
  /** Stored week-over-week change already shown on the city line. Null when that city has no prior print. */
  changePct: number | null;
  /** That city's latest print. When any city has a week, only the newest week is ranked. */
  weekOf?: string | null;
}

/** Same sign as the homepage mover column: "+13.6%" / "-13.2%". */
function signedMove(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

/**
 * Biggest gainer and decliner this week.
 *
 * Same ranking as the homepage Biggest Movers board: each city's stored
 * change_pct (the figure the city line already prints), zeros left off,
 * largest rise and largest fall. Ties break by name, which is the order
 * getAllCities returns. Cities off the newest week are not this week.
 * Null when that week has no prior print, or nobody rose and nobody fell.
 */
export function formatBiggestMoversLine(
  cities: readonly MoverCityPrint[],
): string | null {
  const stamped = cities.map((city) => ({
    ...city,
    week: weekStamp(city.weekOf),
  }));
  const weeks = stamped
    .map((city) => city.week)
    .filter((week): week is string => week != null);
  const latest =
    weeks.length > 0 ? weeks.reduce((a, b) => (a > b ? a : b)) : null;
  const board = latest
    ? stamped.filter((city) => city.week === latest)
    : stamped;

  const finite = board.filter(
    (city): city is typeof city & { changePct: number } =>
      typeof city.changePct === "number" && Number.isFinite(city.changePct),
  );
  if (finite.length === 0) return null;

  const byName = (
    a: { name: string; slug?: string },
    b: { name: string; slug?: string },
  ) =>
    a.name.localeCompare(b.name) ||
    (a.slug ?? "").localeCompare(b.slug ?? "");

  const gainer = finite
    .filter((city) => city.changePct > 0)
    .sort((a, b) => b.changePct - a.changePct || byName(a, b))[0];
  const decliner = finite
    .filter((city) => city.changePct < 0)
    .sort((a, b) => a.changePct - b.changePct || byName(a, b))[0];

  const parts: string[] = [];
  if (gainer) {
    parts.push(`${cityLabel(gainer)} ${signedMove(gainer.changePct)} (gainer)`);
  }
  if (decliner) {
    parts.push(
      `${cityLabel(decliner)} ${signedMove(decliner.changePct)} (decliner)`,
    );
  }
  if (parts.length === 0) return null;
  return `Biggest movers this week: ${parts.join(", ")}.`;
}

/**
 * Current-board rank, priciest first.
 * buildRankLadder is the same order as /rankings (highest BPI is #1).
 * Cities with no print are omitted. Ties keep input order, which is name
 * order from getAllCities, the same list /rankings sorts.
 */
export function ranksPriciestFirst(
  cities: CityDashboardData[],
): Map<string, { rank: number; total: number }> {
  const ranks = new Map<string, { rank: number; total: number }>();
  for (const city of cities) {
    const ladder = buildRankLadder(cities, city.city.slug);
    if (!ladder) continue;
    ranks.set(city.city.slug, { rank: ladder.rank, total: ladder.total });
  }
  return ranks;
}

/**
 * Record high/low set on `weekOf`.
 * findRecordPrintsForWeek applies classifyRecordPrint: strictly past the
 * prior extreme, at least eight earlier weeks, ties omitted.
 */
export function recordDirectionsBySlug(
  cities: readonly RecordCityInput[],
  weekOf: string,
): Map<string, "high" | "low"> {
  const directions = new Map<string, "high" | "low">();
  const week = weekStamp(weekOf);
  if (!week) return directions;
  const { highs, lows } = findRecordPrintsForWeek(cities, week);
  for (const city of highs) directions.set(city.slug, "high");
  for (const city of lows) directions.set(city.slug, "low");
  return directions;
}

/**
 * All-time range clause from buildTradingRange (city-page Trading Range,
 * three prints minimum). Low first, then high. Null when history is short.
 */
export function formatAllTimeRange(
  history: readonly SnapshotLike[] | null | undefined,
): string | null {
  const range = buildTradingRange(history);
  if (!range) return null;
  const lowWeek = weekStamp(range.low.weekOf);
  const highWeek = weekStamp(range.high.weekOf);
  if (!lowWeek || !highWeek) return null;
  const prints = range.weeks === 1 ? "1 print" : `${range.weeks} prints`;
  return `all-time range ${money(range.low.bpi)} (week of ${lowWeek}) to ${money(range.high.bpi)} (week of ${highWeek}) across ${prints}`;
}

/**
 * National all-time range from the homepage national series.
 *
 * Dollars, weeks, and the print count come from buildTradingRange, the
 * same helper as the city range (three prints minimum). The record suffix
 * is classifyRecordPrint, the same rule as the city lines: strictly past
 * the prior extreme, at least eight earlier weeks, ties omitted.
 * Null when the national tape is shorter than that.
 */
export function formatNationalRangeLine(
  history: readonly NationalHistoryPoint[],
): string | null {
  const prints: SnapshotLike[] = trackedNationalPoints(history).map((point) => ({
    week_of: weekStamp(point.week_of)!,
    bpi_score: point.avg_bpi,
    change_pct: null,
  }));
  const range = buildTradingRange(prints);
  if (!range) return null;
  const lowWeek = weekStamp(range.low.weekOf);
  const highWeek = weekStamp(range.high.weekOf);
  if (!lowWeek || !highWeek) return null;
  const count = range.weeks === 1 ? "1 print" : `${range.weeks} prints`;
  const record = recordClause(classifyRecordPrint(prints)?.direction);
  const flag = record ? `; ${record}` : "";
  return `National BPI all-time range: ${money(range.low.bpi)} (week of ${lowWeek}) to ${money(range.high.bpi)} (week of ${highWeek}) across ${count}${flag}.`;
}

function rankClause(
  rank: { rank: number; total: number } | null | undefined,
): string | null {
  if (!rank) return null;
  const { rank: n, total } = rank;
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(total) ||
    n < 1 ||
    total < 1 ||
    n > total
  ) {
    return null;
  }
  return `#${n} of ${total}, priciest first`;
}

function recordClause(
  direction: "high" | "low" | null | undefined,
): string | null {
  if (direction === "high") return "record high";
  if (direction === "low") return "record low";
  return null;
}

export interface LlmsCitySnapshot {
  week_of: string;
  bpi_score: number;
  change_pct: number | null;
  cheapest_price: number;
  cheapest_restaurant: string;
  most_expensive_price: number;
  most_expensive_restaurant: string;
  sample_size: number;
}

export interface LlmsCityLineInput {
  name: string;
  state: string;
  url: string;
  csvUrl: string;
  snapshot: LlmsCitySnapshot | null;
  history?: readonly SnapshotLike[] | null;
  rank?: { rank: number; total: number } | null;
  record?: "high" | "low" | null;
}

/** One city bullet. Rank, range, and record are omitted when unknown. */
export function formatCityLlmsLine(input: LlmsCityLineInput): string {
  const head = `- [${input.name}, ${input.state}](${input.url})`;
  const snapshot = input.snapshot;
  if (!snapshot) return `${head}: no print yet`;

  const extras = [
    rankClause(input.rank),
    formatAllTimeRange(input.history),
    recordClause(input.record),
  ].filter((part): part is string => part != null);

  const extra = extras.length > 0 ? `; ${extras.join("; ")}` : "";
  return `${head}: BPI ${money(snapshot.bpi_score)} for the week of ${snapshot.week_of} (${pct(snapshot.change_pct)}); cheapest ${money(snapshot.cheapest_price)} at ${snapshot.cheapest_restaurant}, priciest ${money(snapshot.most_expensive_price)} at ${snapshot.most_expensive_restaurant}; ${snapshot.sample_size} restaurants sampled${extra}. CSV: ${input.csvUrl}`;
}
