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
   * Week of this print. When the subject city has one, only cities on that
   * same week are ranked — the homepage section is one week, not a mix.
   */
  weekOf?: string | null;
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

  const subjectWeek = weekKey(subject.weekOf);
  const rows: RankedRow[] = [];
  const seen = new Set<string>();

  for (const city of cities) {
    if (seen.has(city.slug)) continue;
    seen.add(city.slug);
    if (subjectWeek && weekKey(city.weekOf) !== subjectWeek) continue;
    const wage = wages[city.slug];
    if (!wage || city.bpi == null) continue;
    const rate = burgersPerHour(wage.min_wage, city.bpi);
    if (rate == null) continue;
    rows.push({
      slug: city.slug,
      name: city.name,
      minWage: wage.min_wage,
      wageSource: wage.source,
      bpi: city.bpi,
      burgersPerHour: rate,
    });
  }

  rows.sort((a, b) => compareByBurgersPerHour(a, b));

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

interface RankedRow extends PurchasingPowerSortable {
  minWage: number;
  wageSource: WageRate["source"];
  bpi: number;
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
