/**
 * Share URL + paste-ready caption helpers (deadpan financial tone).
 */

const DEFAULT_BASE = "https://burgerprice.com";

export function getShareBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

function formatWeekShort(weekOf: string): string {
  const d = new Date(`${weekOf}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return weekOf;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function showdownShareUrl(leftSlug: string, rightSlug: string): string {
  return `${getShareBaseUrl()}/?showdown=${encodeURIComponent(`${leftSlug},${rightSlug}`)}`;
}

export function showdownOgPath(leftSlug?: string, rightSlug?: string): string {
  if (leftSlug && rightSlug) {
    return `/api/og?showdown=${encodeURIComponent(`${leftSlug},${rightSlug}`)}`;
  }
  return "/api/og?showdown=1";
}

export function cityShareUrl(slug: string): string {
  return `${getShareBaseUrl()}/cities/${slug}`;
}

export function buildShowdownCaption(opts: {
  leftName: string;
  leftBpi: number;
  rightName: string;
  rightBpi: number;
  weekOf: string;
  leftSlug: string;
  rightSlug: string;
  /** When true, prefix caption with "NEW · " for Monday fresh-print ritual. */
  fresh?: boolean;
}): string {
  const week = formatWeekShort(opts.weekOf);
  const gap = Math.abs(opts.leftBpi - opts.rightBpi);
  const leader =
    opts.leftBpi === opts.rightBpi
      ? null
      : opts.leftBpi > opts.rightBpi
        ? opts.leftName
        : opts.rightName;
  const spread =
    leader == null
      ? "Locked at parity."
      : `${leader} leads by $${gap.toFixed(2)}.`;
  const body = `${opts.leftName} ($${opts.leftBpi.toFixed(2)}) vs ${opts.rightName} ($${opts.rightBpi.toFixed(2)}) — week of ${week}. ${spread} Track it: ${showdownShareUrl(opts.leftSlug, opts.rightSlug)}`;
  return opts.fresh ? `NEW · ${body}` : body;
}

export function buildCityCaption(opts: {
  name: string;
  state: string;
  slug: string;
  bpi: number | null;
  changePct: number | null;
  /** 1-based rank among tracked cities (highest BPI = #1). */
  rank?: number | null;
  /** Total cities in the ranking universe. */
  totalCities?: number | null;
  /** National average BPI for comparison. */
  nationalAvg?: number | null;
}): string {
  const bpiText =
    opts.bpi == null ? "collecting data" : `$${opts.bpi.toFixed(2)}`;
  const changeText =
    opts.changePct == null || Number.isNaN(opts.changePct)
      ? ""
      : ` (${opts.changePct > 0 ? "+" : ""}${opts.changePct.toFixed(1)}% WoW)`;

  const parts: string[] = [];
  if (opts.rank != null && opts.rank > 0) {
    const of =
      opts.totalCities != null && opts.totalCities > 0
        ? ` of ${opts.totalCities}`
        : "";
    parts.push(`ranks #${opts.rank}${of}`);
  }
  if (opts.nationalAvg != null && !Number.isNaN(opts.nationalAvg)) {
    parts.push(`national prints $${opts.nationalAvg.toFixed(2)}`);
  }
  const context = parts.length > 0 ? ` — ${parts.join("; ")}.` : ".";

  return `${opts.name}, ${opts.state} BPI: ${bpiText}${changeText}${context} Bloomberg Terminal energy, Wendy's drive-thru prices — ${cityShareUrl(opts.slug)}`;
}

export function nationalShareUrl(): string {
  return `${getShareBaseUrl()}/`;
}

export function buildNationalCaption(opts: {
  weekOf: string;
  avgBpi: number;
  changePct?: number | null;
  cityCount?: number;
  /** Lowest-BPI city name (value trade). */
  cheapestCity?: string | null;
  /** Highest-BPI city name (premium print). */
  mostExpensiveCity?: string | null;
}): string {
  const week = formatWeekShort(opts.weekOf);
  const changeText =
    opts.changePct == null || Number.isNaN(opts.changePct)
      ? ""
      : ` (${opts.changePct > 0 ? "+" : ""}${opts.changePct.toFixed(1)}% WoW)`;

  let extremes = "";
  if (opts.cheapestCity && opts.mostExpensiveCity) {
    extremes =
      opts.cheapestCity === opts.mostExpensiveCity
        ? ` ${opts.cheapestCity} holds both ends of the tape.`
        : ` ${opts.cheapestCity} is the value trade; ${opts.mostExpensiveCity} prints the premium.`;
  } else if (opts.cheapestCity) {
    extremes = ` ${opts.cheapestCity} is the value trade this week.`;
  } else if (opts.mostExpensiveCity) {
    extremes = ` ${opts.mostExpensiveCity} prints the premium this week.`;
  }

  const coverage =
    opts.cityCount && opts.cityCount > 0
      ? ` Avg across ${opts.cityCount} cities.`
      : "";

  return `National BPI: $${opts.avgBpi.toFixed(2)}${changeText} — week of ${week}.${extremes}${coverage} Bloomberg Terminal energy, Wendy's drive-thru prices — ${nationalShareUrl()}`;
}

export function newsletterShareUrl(weekOf?: string): string {
  if (weekOf) {
    return `${getShareBaseUrl()}/newsletter/${weekOf}`;
  }
  return `${getShareBaseUrl()}/newsletter`;
}

export function newsletterOgPath(weekOf?: string): string {
  if (weekOf) {
    return `/api/og?newsletter=1&week=${encodeURIComponent(weekOf)}`;
  }
  return "/api/og?newsletter=1";
}

export function buildNewsletterCaption(opts: {
  weekOf: string;
  headline: string;
}): string {
  const week = formatWeekShort(opts.weekOf);
  return `BPI Weekly — week of ${week}: "${opts.headline}" The tape doesn't care about your feelings. Read the print: ${newsletterShareUrl(opts.weekOf)}`;
}

export function rankingsShareUrl(): string {
  return `${getShareBaseUrl()}/rankings`;
}

export function rankingsOgPath(): string {
  return "/api/og?rankings=1";
}

export function buildRankingsCaption(opts: {
  weekOf: string;
  avgBpi: number;
  changePct?: number | null;
  cityCount?: number;
  /** Highest-BPI city (premium / #1). */
  topCity?: string | null;
  topBpi?: number | null;
  /** Lowest-BPI city (value trade). */
  valueCity?: string | null;
  valueBpi?: number | null;
}): string {
  const week = formatWeekShort(opts.weekOf);
  const changeText =
    opts.changePct == null || Number.isNaN(opts.changePct)
      ? ""
      : ` (${opts.changePct > 0 ? "+" : ""}${opts.changePct.toFixed(1)}% WoW)`;

  const bits: string[] = [];
  if (opts.topCity && opts.topBpi != null) {
    bits.push(`#1 ${opts.topCity} $${opts.topBpi.toFixed(2)}`);
  }
  if (opts.valueCity) {
    bits.push(
      opts.valueBpi != null
        ? `${opts.valueCity} is the value trade at $${opts.valueBpi.toFixed(2)}`
        : `${opts.valueCity} is the value trade`,
    );
  }
  const board = bits.length > 0 ? ` ${bits.join("; ")}.` : "";
  const coverage =
    opts.cityCount && opts.cityCount > 0
      ? ` ${opts.cityCount} cities on the tape.`
      : "";

  return `BPI Rankings — week of ${week}. National $${opts.avgBpi.toFixed(2)}${changeText}.${board}${coverage} Full board: ${rankingsShareUrl()}`;
}


export function citiesShareUrl(): string {
  return `${getShareBaseUrl()}/cities`;
}

export function citiesOgPath(): string {
  return "/api/og?cities=1";
}

export function buildCitiesCaption(opts: {
  weekOf: string;
  avgBpi: number;
  changePct?: number | null;
  cityCount?: number;
  /** Highest-BPI city (premium print). */
  premiumCity?: string | null;
  premiumBpi?: number | null;
  /** Lowest-BPI city (value trade). */
  valueCity?: string | null;
  valueBpi?: number | null;
}): string {
  const week = formatWeekShort(opts.weekOf);
  const changeText =
    opts.changePct == null || Number.isNaN(opts.changePct)
      ? ""
      : ` (${opts.changePct > 0 ? "+" : ""}${opts.changePct.toFixed(1)}% WoW)`;

  const bits: string[] = [];
  if (opts.valueCity) {
    bits.push(
      opts.valueBpi != null
        ? `${opts.valueCity} is the value trade at $${opts.valueBpi.toFixed(2)}`
        : `${opts.valueCity} is the value trade`,
    );
  }
  if (opts.premiumCity && opts.premiumBpi != null) {
    bits.push(
      `${opts.premiumCity} prints the premium at $${opts.premiumBpi.toFixed(2)}`,
    );
  }
  const board = bits.length > 0 ? ` ${bits.join("; ")}.` : "";
  const coverage =
    opts.cityCount && opts.cityCount > 0
      ? ` ${opts.cityCount} cities on the map.`
      : "";

  return `All Cities BPI — week of ${week}. National $${opts.avgBpi.toFixed(2)}${changeText}.${board}${coverage} Browse the grid: ${citiesShareUrl()}`;
}