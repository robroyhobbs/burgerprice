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
  /**
   * 1-based rank on the current board (buildRankMovements / RankLadder.rank).
   * The whole rank clause is omitted when neither city has a rank, or when
   * adding it (including the NEW · prefix) would push the post over X's limit.
   */
  leftRank?: number | null;
  /**
   * Rank on the prior available print (RankLadder.prevRank).
   * A city with no prior rank prints its rank with no movement; a city that
   * held its rank prints "(flat)".
   */
  leftPrevRank?: number | null;
  rightRank?: number | null;
  rightPrevRank?: number | null;
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
  const url = showdownShareUrl(opts.leftSlug, opts.rightSlug);
  const lead = `${opts.leftName} ($${opts.leftBpi.toFixed(2)}) vs ${opts.rightName} ($${opts.rightBpi.toFixed(2)}) — week of ${week}. ${spread}`;
  const tail = ` Track it: ${url}`;
  const finish = (body: string) => (opts.fresh ? `NEW · ${body}` : body);
  const plain = finish(`${lead}${tail}`);
  const ranks = showdownRankClause(opts);
  if (!ranks) return plain;
  const withClause = finish(`${lead} ${ranks}${tail}`);
  // Same 280 guard as the city caption. The fresh prefix counts; the URL counts as 23.
  if (xPostLength(withClause, url) > X_POST_LIMIT) return plain;
  return withClause;
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
  /**
   * Rank on the prior available print (RankLadder.prevRank / buildRankMovements).
   * The movement clause is omitted when this is missing, equal to rank, or
   * when adding it would push the post over X's limit.
   */
  prevRank?: number | null;
}): string {
  const bpiText =
    opts.bpi == null ? "collecting data" : `$${opts.bpi.toFixed(2)}`;
  const changeText =
    opts.changePct == null || Number.isNaN(opts.changePct)
      ? ""
      : ` (${opts.changePct > 0 ? "+" : ""}${opts.changePct.toFixed(1)}% WoW)`;

  const rankCore =
    opts.rank != null && opts.rank > 0
      ? `ranks #${opts.rank}${
          opts.totalCities != null && opts.totalCities > 0
            ? ` of ${opts.totalCities}`
            : ""
        }`
      : null;

  const url = cityShareUrl(opts.slug);
  const sentence = (rankText: string | null) => {
    const parts: string[] = [];
    if (rankText) parts.push(rankText);
    if (opts.nationalAvg != null && !Number.isNaN(opts.nationalAvg)) {
      parts.push(`national prints $${opts.nationalAvg.toFixed(2)}`);
    }
    const context = parts.length > 0 ? ` — ${parts.join("; ")}.` : ".";
    return `${opts.name}, ${opts.state} BPI: ${bpiText}${changeText}${context} Bloomberg Terminal energy, Wendy's drive-thru prices — ${url}`;
  };

  const plain = sentence(rankCore);
  const move = rankCore ? cityRankMoveClause(opts.rank, opts.prevRank) : null;
  if (!move || !rankCore) return plain;
  const withClause = sentence(`${rankCore}, ${move}`);
  // Same 280 guard as the national caption: drop the clause, keep the print.
  if (xPostLength(withClause, url) > X_POST_LIMIT) return plain;
  return withClause;
}

export function nationalShareUrl(): string {
  return `${getShareBaseUrl()}/`;
}

/** X wraps every link as a t.co URL and counts it as 23 characters. */
const X_URL_WEIGHT = 23;
const X_POST_LIMIT = 280;

function xPostLength(text: string, url: string): number {
  if (!url) return text.length;
  let length = 0;
  let rest = text;
  while (rest.includes(url)) {
    const at = rest.indexOf(url);
    length += at + X_URL_WEIGHT;
    rest = rest.slice(at + url.length);
  }
  return length + rest.length;
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
  /**
   * Climber/slide sentence from newsletterRankShareClause.
   * Omitted when null, blank, or when it would push the post over X's limit.
   */
  rankLine?: string | null;
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

  const url = nationalShareUrl();
  const lead = `National BPI: $${opts.avgBpi.toFixed(2)}${changeText} — week of ${week}.${extremes}${coverage}`;
  const tail = ` Bloomberg Terminal energy, Wendy's drive-thru prices — ${url}`;
  const plain = `${lead}${tail}`;
  const rank = opts.rankLine?.trim().replace(/\.+$/, "");
  if (!rank) return plain;
  const withClause = `${lead} ${rank}.${tail}`;
  // Monday X posts reuse this caption. Drop the clause rather than exceed 280.
  if (xPostLength(withClause, url) > X_POST_LIMIT) return plain;
  return withClause;
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

function rankMoveCount(spots: number): string {
  return spots === 1 ? "1 spot" : String(spots);
}

/**
 * This city's move vs the prior available print.
 * Null when the rank or the prior rank is unknown. "flat" when the rank held.
 */
function rankStep(
  rank: number | null | undefined,
  prevRank: number | null | undefined,
):
  | { kind: "up" | "down"; spots: number; prevRank: number }
  | { kind: "flat" }
  | null {
  if (rank == null || !(rank > 0)) return null;
  if (prevRank == null || !(prevRank > 0)) return null;
  const spots = Math.abs(prevRank - rank);
  if (spots === 0) return { kind: "flat" };
  return {
    kind: prevRank > rank ? "up" : "down",
    spots,
    prevRank,
  };
}

/**
 * This city's own move vs the prior available print.
 * "up 3 from #10" / "down 1 spot from #4". Null when the rank held or
 * the prior rank is unknown, so the caption stays the plain print line.
 */
function cityRankMoveClause(
  rank: number | null | undefined,
  prevRank: number | null | undefined,
): string | null {
  const step = rankStep(rank, prevRank);
  if (!step || step.kind === "flat") return null;
  return `${step.kind} ${rankMoveCount(step.spots)} from #${step.prevRank}`;
}

/** "Portland #7 (up 3)" / "Boston #5 (flat)" / "Boston #5" when prior is unknown. */
function showdownCityRankBit(
  name: string,
  rank: number | null | undefined,
  prevRank: number | null | undefined,
): string | null {
  if (rank == null || !(rank > 0)) return null;
  const step = rankStep(rank, prevRank);
  if (!step) return `${name} #${rank}`;
  if (step.kind === "flat") return `${name} #${rank} (flat)`;
  return `${name} #${rank} (${step.kind} ${rankMoveCount(step.spots)})`;
}

function showdownRankClause(opts: {
  leftName: string;
  leftRank?: number | null;
  leftPrevRank?: number | null;
  rightName: string;
  rightRank?: number | null;
  rightPrevRank?: number | null;
}): string | null {
  const bits = [
    showdownCityRankBit(opts.leftName, opts.leftRank, opts.leftPrevRank),
    showdownCityRankBit(opts.rightName, opts.rightRank, opts.rightPrevRank),
  ].filter((bit): bit is string => bit != null);
  if (bits.length === 0) return null;
  return `Ranks: ${bits.join(", ")}.`;
}

/**
 * Compact climber/slide sentence for share captions (newsletter and the
 * national Monday print). Null when the board didn't move, so the caption
 * stays the plain print line.
 */
export function newsletterRankShareClause(
  shakeup: {
    climber: { name: string; spots: number; rank: number } | null;
    slider: { name: string; spots: number; rank: number } | null;
  } | null,
): string | null {
  if (!shakeup) return null;
  const parts: string[] = [];
  if (shakeup.climber) {
    const { name, spots, rank } = shakeup.climber;
    parts.push(`${name} climbed ${rankMoveCount(spots)} to #${rank}`);
  }
  if (shakeup.slider) {
    const { name, spots, rank } = shakeup.slider;
    parts.push(`${name} slid ${rankMoveCount(spots)} to #${rank}`);
  }
  if (parts.length === 0) return null;
  return `${parts.join(" and ")}.`;
}

export function buildNewsletterCaption(opts: {
  weekOf: string;
  headline: string;
  /** Punchy rank-movement sentence. Omitted when null or blank. */
  rankLine?: string | null;
}): string {
  const week = formatWeekShort(opts.weekOf);
  const rank = opts.rankLine?.trim().replace(/\.+$/, "");
  const movement = rank ? ` ${rank}.` : "";
  return `BPI Weekly — week of ${week}: "${opts.headline}"${movement} The tape doesn't care about your feelings. Read the print: ${newsletterShareUrl(opts.weekOf)}`;
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
  /**
   * Climber/slide sentence from newsletterRankShareClause.
   * Omitted when null, blank, or when it would push the post over X's limit.
   */
  rankLine?: string | null;
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

  const url = rankingsShareUrl();
  const lead = `BPI Rankings — week of ${week}. National $${opts.avgBpi.toFixed(2)}${changeText}.${board}`;
  const tail = `${coverage} Full board: ${url}`;
  const plain = `${lead}${tail}`;
  const rank = opts.rankLine?.trim().replace(/\.+$/, "");
  if (!rank) return plain;
  const withClause = `${lead} ${rank}.${tail}`;
  // Same 280 guard as the national caption: drop the clause, keep the board.
  if (xPostLength(withClause, url) > X_POST_LIMIT) return plain;
  return withClause;
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

export function aboutShareUrl(): string {
  return `${getShareBaseUrl()}/about`;
}

export function aboutOgPath(): string {
  return "/api/og?about=1";
}

export function buildAboutCaption(opts?: {
  cityCount?: number;
}): string {
  const coverage =
    opts?.cityCount && opts.cityCount > 0
      ? ` ${opts.cityCount} US cities on the tape.`
      : " 10 US cities on the tape.";
  return `How we print the BPI — weighted Fast Food 20% / Casual 40% / Premium 40%.${coverage} Bloomberg Terminal rigor, Wendy's frostiness. Not financial advice. Read the methodology: ${aboutShareUrl()}`;
}
