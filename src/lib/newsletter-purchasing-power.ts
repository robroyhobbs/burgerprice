import {
  buildPurchasingPowerBoard,
  type PowerCity,
  type PurchasingPowerBoardRow,
  type WageTable,
} from "./purchasing-power-rank";

/** One city on a purchasing-power extreme (best or toughest). */
export interface PurchasingPowerCityRef {
  slug: string;
  name: string;
  state: string | null;
  minWage: number;
  bpi: number;
  /** Two-decimal burgers/hr from burgersPerHour. Print with toFixed(1). */
  burgersPerHour: number;
}

/**
 * Best and toughest purchasing power for one print.
 * `best` is every city tied for the most burgers/hr; `toughest` is every
 * city tied for the fewest. Both lists follow the board order (name, then slug).
 */
export interface PurchasingPowerBrief {
  weekOf: string;
  best: PurchasingPowerCityRef[];
  toughest: PurchasingPowerCityRef[];
}

/**
 * City history the newsletter reads. Matches CityDashboardData.
 * A later row on the same week is the print that counts.
 */
export interface PurchasingPowerWeekCity {
  city: { slug: string; name: string; state?: string | null };
  history?: readonly { week_of: string; bpi_score: number | null }[] | null;
}

export type PurchasingPowerToken =
  | { type: "text"; text: string }
  | { type: "city"; slug: string; name: string };

export interface PurchasingPowerBriefLines {
  best: PurchasingPowerToken[];
  /** Null when every ranked city shares one rate — toughest would repeat best. */
  toughest: PurchasingPowerToken[] | null;
}

/**
 * Purchasing power for one edition week.
 * Uses that week's city BPI only. A later print never leaks into an archived
 * issue, the same rule findRecordPrintsForWeek uses for records. Rank, wage,
 * and burgers/hr come from buildPurchasingPowerBoard. Null when fewer than
 * two cities can be ranked, which is the signal to hide the section.
 */
export function buildPurchasingPowerBriefForWeek(
  cities: readonly PurchasingPowerWeekCity[],
  weekOf: string,
  wages?: WageTable,
): PurchasingPowerBrief | null {
  const week = weekKey(weekOf);
  if (!week) return null;

  const powerCities: PowerCity[] = [];
  const seen = new Set<string>();
  for (const entry of cities) {
    const city = entry.city;
    if (!city?.slug || seen.has(city.slug)) continue;
    seen.add(city.slug);
    powerCities.push({
      slug: city.slug,
      name: city.name,
      state: city.state ?? undefined,
      bpi: bpiOnWeek(entry.history, week),
      weekOf: week,
    });
  }

  const rows = buildPurchasingPowerBoard(powerCities, {
    ...(wages ? { wages } : {}),
    weekOf: week,
  });
  if (!rows) return null;

  const bestRate = rows[0].burgersPerHour;
  const lowRate = rows[rows.length - 1].burgersPerHour;
  return {
    weekOf: week,
    best: rows.filter((row) => sameRate(row.burgersPerHour, bestRate)).map(toRef),
    toughest: rows
      .filter((row) => sameRate(row.burgersPerHour, lowRate))
      .map(toRef),
  };
}

/** Newsletter lines. City tokens stay separate so the page can link them. */
export function purchasingPowerBriefTokens(
  brief: PurchasingPowerBrief,
): PurchasingPowerBriefLines {
  if (brief.best.length === 0) return { best: [], toughest: null };
  const hideToughest =
    brief.toughest.length === 0 ||
    sameRate(
      brief.best[0].burgersPerHour,
      brief.toughest[0].burgersPerHour,
    );
  return {
    best: extremeTokens("Best value: ", brief.best, "best"),
    toughest: hideToughest
      ? null
      : extremeTokens("Toughest: ", brief.toughest, "toughest"),
  };
}

/** Plain text of purchasingPowerBriefTokens, for tests. */
export function formatPurchasingPowerBrief(brief: PurchasingPowerBrief): {
  best: string;
  toughest: string | null;
} {
  const lines = purchasingPowerBriefTokens(brief);
  return {
    best: joinTokens(lines.best),
    toughest: lines.toughest ? joinTokens(lines.toughest) : null,
  };
}

function extremeTokens(
  label: string,
  cities: readonly PurchasingPowerCityRef[],
  kind: "best" | "toughest",
): PurchasingPowerToken[] {
  const tokens: PurchasingPowerToken[] = [];
  const wage = sharedWage(cities);
  const rate = cities[0].burgersPerHour.toFixed(1);
  pushText(tokens, label);
  appendCities(tokens, cities, wage == null);
  if (kind === "best") {
    pushText(
      tokens,
      wage == null
        ? `, tied at ${rate} burgers per hour of minimum wage.`
        : `, ${rate} burgers per hour of minimum wage ($${wage.toFixed(2)}/hr).`,
    );
  } else {
    pushText(
      tokens,
      wage == null
        ? `, tied at ${rate} burgers/hr.`
        : `, ${rate} burgers/hr at $${wage.toFixed(2)}/hr.`,
    );
  }
  return tokens;
}

function appendCities(
  tokens: PurchasingPowerToken[],
  cities: readonly PurchasingPowerCityRef[],
  withWage: boolean,
): void {
  cities.forEach((city, i) => {
    const sep = citySeparator(i, cities.length);
    if (sep) pushText(tokens, sep);
    tokens.push({ type: "city", slug: city.slug, name: city.name });
    if (withWage) pushText(tokens, ` ($${city.minWage.toFixed(2)}/hr)`);
  });
}

function citySeparator(index: number, total: number): string {
  if (index === 0) return "";
  if (index === total - 1) return total === 2 ? " and " : ", and ";
  return ", ";
}

function pushText(tokens: PurchasingPowerToken[], text: string): void {
  const prev = tokens[tokens.length - 1];
  if (prev && prev.type === "text") prev.text += text;
  else tokens.push({ type: "text", text });
}

function joinTokens(tokens: readonly PurchasingPowerToken[]): string {
  return tokens
    .map((token) => (token.type === "text" ? token.text : token.name))
    .join("");
}

/** Integer cents, same key the board uses to tell 1.22 from 1.21. */
function sameRate(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

function sharedWage(cities: readonly { minWage: number }[]): number | null {
  const cents = Math.round(cities[0].minWage * 100);
  return cities.every((city) => Math.round(city.minWage * 100) === cents)
    ? cities[0].minWage
    : null;
}

function toRef(row: PurchasingPowerBoardRow): PurchasingPowerCityRef {
  return {
    slug: row.slug,
    name: row.name,
    state: row.state,
    minWage: row.minWage,
    bpi: row.bpi,
    burgersPerHour: row.burgersPerHour,
  };
}

/**
 * Finite BPI printed on `week`. Later rows on that week replace earlier ones.
 * A different week is ignored, including a newer print.
 */
function bpiOnWeek(
  history: PurchasingPowerWeekCity["history"],
  week: string,
): number | null {
  let found: number | null = null;
  for (const snap of history ?? []) {
    if (weekKey(snap.week_of) !== week) continue;
    if (typeof snap.bpi_score !== "number" || !Number.isFinite(snap.bpi_score)) {
      continue;
    }
    found = snap.bpi_score;
  }
  return found;
}

function weekKey(week: string | null | undefined): string | null {
  if (!week) return null;
  const key = week.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}
