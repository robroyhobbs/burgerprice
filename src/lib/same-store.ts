/**
 * Same-store check — Bloomberg Terminal × Wendy's.
 *
 * The weekly basket can change restaurant to restaurant, so a big WoW move can
 * be menu prices moving or the sample changing. This compares only the
 * restaurants that were on both this week's and last week's tape.
 */

type PriceLike = { restaurant: string; burger: string; price: number };

export interface SameStoreRow {
  restaurant: string;
  burger: string;
  /** Last week's burger name when it differs from this week's. */
  previousBurger: string | null;
  previous: number;
  current: number;
  changePct: number;
}

export interface SameStoreCheck {
  rows: SameStoreRow[];
  /** Average per-restaurant % move across carried-over spots; null if none. */
  avgChangePct: number | null;
  currentCount: number;
  previousCount: number;
  newCount: number;
  droppedCount: number;
}

/** Loose restaurant key: case, punctuation, "&"/"and", and leading "The" ignored. */
export function restaurantKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the /, "")
    .replace(/\s+/g, "");
}

function byRestaurant(prices: PriceLike[]): Map<string, PriceLike> {
  const map = new Map<string, PriceLike>();
  for (const p of prices) {
    if (!p?.restaurant || !Number.isFinite(p.price) || p.price <= 0) continue;
    const key = restaurantKey(p.restaurant);
    if (key && !map.has(key)) map.set(key, p);
  }
  return map;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildSameStoreCheck(
  current: PriceLike[] | null | undefined,
  previous: PriceLike[] | null | undefined,
): SameStoreCheck | null {
  if (!current?.length || !previous?.length) return null;
  const cur = byRestaurant(current);
  const prev = byRestaurant(previous);
  if (cur.size === 0 || prev.size === 0) return null;

  const rows: SameStoreRow[] = [];
  for (const [key, c] of cur) {
    const p = prev.get(key);
    if (!p) continue;
    rows.push({
      restaurant: c.restaurant,
      burger: c.burger,
      previousBurger:
        p.burger && p.burger.trim().toLowerCase() !== c.burger?.trim().toLowerCase()
          ? p.burger
          : null,
      previous: p.price,
      current: c.price,
      changePct: round1(((c.price - p.price) / p.price) * 100),
    });
  }
  rows.sort((a, b) => b.changePct - a.changePct || a.current - b.current);

  const avgChangePct =
    rows.length > 0
      ? round1(rows.reduce((s, r) => s + r.changePct, 0) / rows.length)
      : null;

  return {
    rows,
    avgChangePct,
    currentCount: cur.size,
    previousCount: prev.size,
    newCount: cur.size - rows.length,
    droppedCount: prev.size - rows.length,
  };
}

function signed(pct: number): string {
  if (pct === 0) return "flat";
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/** One or two deadpan sentences explaining the headline move vs same-store. */
export function buildSameStoreStory(
  cityName: string,
  check: SameStoreCheck,
  headlineChangePct: number | null,
): string {
  const { rows, avgChangePct, currentCount, newCount, droppedCount } = check;
  const mix =
    newCount === 0 && droppedCount === 0
      ? "same basket both weeks"
      : `${newCount} new spot${newCount === 1 ? "" : "s"} in, ${droppedCount} rolled off`;

  if (rows.length === 0 || avgChangePct == null) {
    return `None of this week's ${currentCount} ${cityName} spots were on last week's tape, so the weekly move is a new basket, not a menu-board change. Read it as a fresh print.`;
  }

  const moved =
    avgChangePct === 0
      ? "held flat on average"
      : `moved ${signed(avgChangePct)} on average`;
  const lead = `${rows.length} of ${currentCount} ${cityName} spots were also on last week's tape, and their burgers ${moved}.`;

  if (headlineChangePct == null || Number.isNaN(headlineChangePct)) {
    return `${lead} Basket turnover: ${mix}.`;
  }

  const gap = Math.abs(headlineChangePct - avgChangePct);
  if (gap >= 5) {
    return `${lead} The headline ${signed(headlineChangePct)} is mostly basket mix (${mix}). The menu boards didn't move that much; the sample did.`;
  }
  return `${lead} That tracks the headline ${signed(headlineChangePct)}, so this one's real price action (${mix}).`;
}

/** Headline-vs-same-store gap (pct points) that reads as basket mix. */
export const SAME_STORE_MIX_GAP = 5;

export interface TapeSameStoreRead {
  slug: string;
  sameStore: number | null;
  carried: number;
  total: number;
  /** "mix" when the headline is mostly basket turnover, "real" when menu boards moved it. */
  read: "real" | "mix" | "new-basket" | null;
  /** True when this week is the city's latest print, so /cities/<slug>#same-store matches it. */
  isLatest: boolean;
}

type HistoryCity = {
  city: { slug: string; name: string };
  history: { week_of: string; change_pct: number | null; raw_prices: PriceLike[] | null }[];
};

/** City-name key for matching newsletter tape rows ("Austin", "Austin, TX") to cities. */
export function cityNameKey(name: string): string {
  return name.split(",")[0].toLowerCase().replace(/[^a-z]+/g, "");
}

/**
 * Same-store read per city for a given print week, using that week's snapshot
 * and the one before it in history. Works for archived editions too.
 */
export function buildWeekSameStoreReads(
  cities: HistoryCity[],
  weekOf: string,
): Map<string, TapeSameStoreRead> {
  const out = new Map<string, TapeSameStoreRead>();
  const week = weekOf.slice(0, 10);
  for (const c of cities) {
    const hist = c.history ?? [];
    const idx = hist.findIndex((s) => String(s.week_of).slice(0, 10) === week);
    if (idx <= 0) continue;
    const cur = hist[idx];
    const prev = hist[idx - 1];
    const check = buildSameStoreCheck(cur.raw_prices ?? [], prev.raw_prices ?? []);
    if (!check) continue;
    const headline = cur.change_pct;
    let read: TapeSameStoreRead["read"] = null;
    if (check.avgChangePct == null) read = "new-basket";
    else if (headline != null && !Number.isNaN(headline))
      read = Math.abs(headline - check.avgChangePct) >= SAME_STORE_MIX_GAP ? "mix" : "real";
    out.set(cityNameKey(c.city.name), {
      slug: c.city.slug,
      sameStore: check.avgChangePct,
      carried: check.rows.length,
      total: check.currentCount,
      read,
      isLatest: idx === hist.length - 1,
    });
  }
  return out;
}
