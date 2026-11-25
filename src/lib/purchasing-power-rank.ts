import { getAllWages } from "./wages";

/**
 * Wage fields the purchasing-power math reads.
 * Defaults to the shared table in wages.ts — do not copy those numbers.
 */
export interface WageRate {
  min_wage: number;
  source: "city" | "state" | "federal";
}

export type WageTable = Record<string, WageRate>;

export interface PowerCity {
  slug: string;
  name: string;
  bpi: number | null;
  /**
   * Week of this print. When a week is in scope, only cities on that same
   * week are ranked — one print, not a mix.
   */
  weekOf?: string | null;
  /** Postal abbreviation. The rankings board prints it; the rank line does not. */
  state?: string;
}

export interface PurchasingPowerSortable {
  burgersPerHour: number;
  name: string;
  slug: string;
}

export interface PurchasingPowerRank {
  slug: string;
  name: string;
  rank: number;
  total: number;
  minWage: number;
  wageSource: WageRate["source"];
  bpi: number;
  /** Two-decimal burgers/hr. Same rounding the collector stores. */
  burgersPerHour: number;
  rankLine: string;
  leaderName: string;
  leaderBurgersPerHour: number;
  runnerUpName: string | null;
  runnerUpBurgersPerHour: number | null;
}

export interface PurchasingPowerFaq {
  q: string;
  a: string;
}

/** One row on the /rankings purchasing-power board. Most burgers/hr is rank 1. */
export interface PurchasingPowerBoardRow {
  rank: number;
  slug: string;
  name: string;
  state: string | null;
  minWage: number;
  wageSource: WageRate["source"];
  bpi: number;
  /** Two-decimal burgers/hr. Same rounding the city card stores; print with toFixed(1). */
  burgersPerHour: number;
}

export interface PurchasingPowerBoardQuery {
  wages?: WageTable;
  /**
   * When this is a week (YYYY-MM-DD, or a timestamp that starts with one),
   * only cities on that print are ranked — the same week cut the city card uses.
   * Omit it to rank every city that has a wage and a positive BPI.
   */
  weekOf?: string | null;
}

/** The board stays off the page until at least two cities can be ranked. */
const MIN_BOARD_ROWS = 2;

export const PURCHASING_POWER_BOARD_QUESTION =
  "Which city's minimum wage buys the most burgers?";

/**
 * Burgers one hour of minimum wage buys: wage / BPI, rounded to 2 decimals.
 * Same formula the collector stores and the city card prints (then to 1 decimal).
 * Null when BPI is missing or not positive.
 */
export function burgersPerHour(minWage: number, bpi: number): number | null {
  if (!Number.isFinite(minWage) || !Number.isFinite(bpi) || bpi <= 0) return null;
  return Math.round((minWage / bpi) * 100) / 100;
}

/**
 * Homepage "Burger Purchasing Power" order: most burgers/hr first.
 * The sort key is the 2-decimal rate (what the section stores and orders by),
 * not the 1-decimal label. Ties break by city name, then slug.
 */
export function compareByBurgersPerHour(
  a: PurchasingPowerSortable,
  b: PurchasingPowerSortable,
): number {
  const byRate = rateKey(b.burgersPerHour) - rateKey(a.burgersPerHour);
  if (byRate !== 0) return byRate;
  const byName = a.name.localeCompare(b.name);
  if (byName !== 0) return byName;
  return a.slug.localeCompare(b.slug);
}

/**
 * Where `slug` sits on this week's purchasing-power board.
 * Null when that city has no wage, or no positive BPI to divide by.
 */
export function buildPurchasingPowerRank(
  cities: readonly PowerCity[],
  slug: string,
  wages: WageTable = getAllWages(),
): PurchasingPowerRank | null {
  const subject = cities.find((city) => city.slug === slug);
  const subjectWage = wages[slug];
  if (!subject || !subjectWage || subject.bpi == null) return null;
  if (burgersPerHour(subjectWage.min_wage, subject.bpi) == null) return null;

  const rows = collectRankedRows(cities, wages, weekKey(subject.weekOf));
  const index = rows.findIndex((row) => row.slug === slug);
  if (index === -1) return null;

  const self = rows[index];
  const leader = rows[0];
  const runnerUp = rows[1] ?? null;

  return {
    slug: self.slug,
    name: self.name,
    rank: index + 1,
    total: rows.length,
    minWage: self.minWage,
    wageSource: self.wageSource,
    bpi: self.bpi,
    burgersPerHour: self.burgersPerHour,
    rankLine: formatRankLine(rows, index),
    leaderName: leader.name,
    leaderBurgersPerHour: leader.burgersPerHour,
    runnerUpName: runnerUp?.name ?? null,
    runnerUpBurgersPerHour: runnerUp?.burgersPerHour ?? null,
  };
}

/**
 * FAQ entry for the city page accordion and FAQPage JSON-LD.
 * Null when wage data is missing — same omission as the rank line.
 */
export function buildPurchasingPowerFaq(
  cities: readonly PowerCity[],
  slug: string,
  wages?: WageTable,
): PurchasingPowerFaq | null {
  const rank = wages
    ? buildPurchasingPowerRank(cities, slug, wages)
    : buildPurchasingPowerRank(cities, slug);
  if (!rank) return null;

  return {
    q: `How many burgers can an hour of minimum wage buy in ${rank.name}?`,
    a: `$${rank.minWage.toFixed(2)}/hr ${rank.wageSource} min wage, BPI $${rank.bpi.toFixed(2)}, ${rank.burgersPerHour.toFixed(1)} burgers/hr. ${rank.rankLine}`,
  };
}

/**
 * Full purchasing-power board for one print.
 * Most burgers/hr first — the same order `buildPurchasingPowerRank` uses —
 * so a city's rank here matches the line on its city page.
 * Omits a city with no wage or no positive BPI. Null when fewer than two
 * cities remain, which is the signal to hide the section.
 */
export function buildPurchasingPowerBoard(
  cities: readonly PowerCity[],
  query: PurchasingPowerBoardQuery = {},
): PurchasingPowerBoardRow[] | null {
  const rows = collectRankedRows(
    cities,
    query.wages ?? getAllWages(),
    weekKey(query.weekOf),
  );
  if (rows.length < MIN_BOARD_ROWS) return null;
  return rows.map((row, index) => ({
    rank: index + 1,
    slug: row.slug,
    name: row.name,
    state: row.state,
    minWage: row.minWage,
    wageSource: row.wageSource,
    bpi: row.bpi,
    burgersPerHour: row.burgersPerHour,
  }));
}

/**
 * Rankings FAQ entry for the visible accordion and FAQPage JSON-LD.
 * Null when the board itself is hidden, so the two stay in lockstep.
 * The rank sentence is the same line the leader's city card prints.
 */
export function buildPurchasingPowerBoardFaq(
  rows: readonly PurchasingPowerBoardRow[] | null,
): PurchasingPowerFaq | null {
  if (!rows || rows.length < MIN_BOARD_ROWS) return null;
  const leader = rows[0];
  const ranked: RankedRow[] = rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    state: row.state,
    minWage: row.minWage,
    wageSource: row.wageSource,
    bpi: row.bpi,
    burgersPerHour: row.burgersPerHour,
  }));
  return {
    q: PURCHASING_POWER_BOARD_QUESTION,
    a: `${leader.name}. $${leader.minWage.toFixed(2)}/hr ${leader.wageSource} min wage, BPI $${leader.bpi.toFixed(2)}, ${leader.burgersPerHour.toFixed(1)} burgers/hr. ${formatRankLine(ranked, 0)}`,
  };
}

interface RankedRow extends PurchasingPowerSortable {
  state: string | null;
  minWage: number;
  wageSource: WageRate["source"];
  bpi: number;
}

/**
 * Cities that can be ranked on `week` (or on any week, when `week` is null).
 * First slug wins. Sort is the shared purchasing-power order.
 */
function collectRankedRows(
  cities: readonly PowerCity[],
  wages: WageTable,
  week: string | null,
): RankedRow[] {
  const rows: RankedRow[] = [];
  const seen = new Set<string>();

  for (const city of cities) {
    if (seen.has(city.slug)) continue;
    seen.add(city.slug);
    if (week && weekKey(city.weekOf) !== week) continue;
    const wage = wages[city.slug];
    if (!wage || city.bpi == null) continue;
    const rate = burgersPerHour(wage.min_wage, city.bpi);
    if (rate == null) continue;
    rows.push({
      slug: city.slug,
      name: city.name,
      state: city.state ?? null,
      minWage: wage.min_wage,
      wageSource: wage.source,
      bpi: city.bpi,
      burgersPerHour: rate,
    });
  }

  rows.sort((a, b) => compareByBurgersPerHour(a, b));
  return rows;
}

function formatRankLine(rows: RankedRow[], index: number): string {
  const self = rows[index];
  const head = `#${index + 1} of ${rows.length} for purchasing power (most burgers per hour first).`;
  if (index === 0) {
    const next = rows[1];
    if (!next) {
      return `${head} ${self.name} leads at ${self.burgersPerHour.toFixed(1)} burgers/hr.`;
    }
    return `${head} ${self.name} leads; ${next.name} is next at ${next.burgersPerHour.toFixed(1)} burgers/hr.`;
  }
  const leader = rows[0];
  return `${head} ${leader.name} leads at ${leader.burgersPerHour.toFixed(1)} burgers/hr.`;
}

/** Integer cents of burgers/hr so 1.22 sorts ahead of 1.21 without float noise. */
function rateKey(value: number): number {
  return Math.round(value * 100);
}

function weekKey(week: string | null | undefined): string | null {
  if (!week) return null;
  const key = week.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}
