import type {
  DashboardData,
  CityDashboardData,
  BpiSnapshot,
  BurgerSpotlight,
  MarketReport,
  IndustryNewsItem,
  City,
  NationalBpiPoint,
  SpreadEntry,
  PurchasingPowerEntry,
  RawPrice,
  MarketFactor,
} from "./types";
import { calculateBpi, calculateChange, findExtremes } from "./bpi";
import {
  WEEKS,
  BOSTON_PRICES,
  SEATTLE_PRICES,
  BOSTON_SPOTLIGHTS,
  SEATTLE_SPOTLIGHTS,
  MARKET_REPORTS,
  INDUSTRY_NEWS,
} from "./seed-data";
import { resolveDataMode, isDatabaseRequired } from "./mode";

const CITIES: City[] = [
  {
    id: "boston",
    name: "Boston",
    state: "MA",
    slug: "boston-ma",
    lat: 42.3601,
    lng: -71.0589,
  },
  {
    id: "seattle",
    name: "Seattle",
    state: "WA",
    slug: "seattle-wa",
    lat: 47.6062,
    lng: -122.3321,
  },
];

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function dateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  return String(v ?? "");
}

function isoTimestamp(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return new Date().toISOString();
}

function mapCity(row: Record<string, unknown>): City {
  return {
    id: String(row.id),
    name: String(row.name),
    state: String(row.state),
    slug: String(row.slug),
    lat: numOrNull(row.lat),
    lng: numOrNull(row.lng),
  };
}

function mapSnapshot(row: Record<string, unknown>): BpiSnapshot {
  let raw: unknown = row.raw_prices;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }

  return {
    id: String(row.id),
    city_id: String(row.city_id),
    week_of: dateStr(row.week_of),
    bpi_score: num(row.bpi_score),
    change_pct: numOrNull(row.change_pct),
    cheapest_price: num(row.cheapest_price),
    cheapest_restaurant: String(row.cheapest_restaurant ?? ""),
    most_expensive_price: num(row.most_expensive_price),
    most_expensive_restaurant: String(row.most_expensive_restaurant ?? ""),
    avg_price: num(row.avg_price),
    sample_size: num(row.sample_size),
    raw_prices: (Array.isArray(raw) ? raw : []) as RawPrice[],
    created_at: isoTimestamp(row.created_at),
  };
}

function mapSpotlight(row: Record<string, unknown>): BurgerSpotlight {
  return {
    id: String(row.id),
    city_id: String(row.city_id),
    week_of: dateStr(row.week_of),
    restaurant_name: String(row.restaurant_name),
    burger_name: String(row.burger_name),
    price: num(row.price),
    description: String(row.description ?? ""),
    image_url: row.image_url ? String(row.image_url) : undefined,
  };
}

function mapReport(row: Record<string, unknown>): MarketReport {
  let factors: unknown = row.factors;
  if (typeof factors === "string") {
    try {
      factors = JSON.parse(factors);
    } catch {
      factors = [];
    }
  }
  return {
    id: String(row.id),
    week_of: dateStr(row.week_of),
    headline: String(row.headline),
    summary: String(row.summary),
    factors: (Array.isArray(factors) ? factors : []) as MarketFactor[],
  };
}

function mapNews(row: Record<string, unknown>): IndustryNewsItem {
  return {
    id: String(row.id),
    week_of: dateStr(row.week_of),
    title: String(row.title),
    summary: String(row.summary),
    category: String(row.category ?? "market"),
    source: row.source == null ? null : String(row.source),
    impact: (row.impact as IndustryNewsItem["impact"]) ?? "neutral",
    created_at: row.created_at ? isoTimestamp(row.created_at) : undefined,
  };
}

function buildSeedSnapshots(citySlug: string): BpiSnapshot[] {
  const priceMap = citySlug === "boston-ma" ? BOSTON_PRICES : SEATTLE_PRICES;
  const snapshots: BpiSnapshot[] = [];
  let prevBpi: number | null = null;

  for (const week of WEEKS) {
    const prices = priceMap[week];
    if (!prices) continue;

    const bpiScore = calculateBpi(prices);
    const changePct = calculateChange(bpiScore, prevBpi);
    const extremes = findExtremes(prices);

    snapshots.push({
      id: `${citySlug}-${week}`,
      city_id: citySlug === "boston-ma" ? "boston" : "seattle",
      week_of: week,
      bpi_score: bpiScore,
      change_pct: changePct,
      cheapest_price: extremes.cheapest.price,
      cheapest_restaurant: extremes.cheapest.restaurant,
      most_expensive_price: extremes.mostExpensive.price,
      most_expensive_restaurant: extremes.mostExpensive.restaurant,
      avg_price:
        Math.round(
          (prices.reduce((s, p) => s + p.price, 0) / prices.length) * 100,
        ) / 100,
      sample_size: prices.length,
      raw_prices: prices,
      created_at: new Date().toISOString(),
    });

    prevBpi = bpiScore;
  }

  return snapshots;
}

function buildSeedSpotlights(citySlug: string): BurgerSpotlight[] {
  const spotlightMap =
    citySlug === "boston-ma" ? BOSTON_SPOTLIGHTS : SEATTLE_SPOTLIGHTS;
  return WEEKS.map((week) => {
    const s = spotlightMap[week];
    if (!s) return null;
    return {
      id: `spotlight-${citySlug}-${week}`,
      city_id: citySlug === "boston-ma" ? "boston" : "seattle",
      week_of: week,
      restaurant_name: s.restaurant_name,
      burger_name: s.burger_name,
      price: s.price,
      description: s.description,
    };
  }).filter(Boolean) as BurgerSpotlight[];
}

function buildSeedReports(): MarketReport[] {
  return WEEKS.map((week) => {
    const r = MARKET_REPORTS[week];
    if (!r) return null;
    return {
      id: `report-${week}`,
      week_of: week,
      headline: r.headline,
      summary: r.summary,
      factors: r.factors,
    };
  }).filter(Boolean) as MarketReport[];
}

/**
 * Get dashboard data. Prefers Postgres (DATABASE_URL), then Supabase, else seed.
 * When REQUIRE_DATABASE=true, DB failures are surfaced (no silent seed fallback).
 */
export async function getDashboardData(): Promise<DashboardData> {
  const mode = resolveDataMode();

  if (mode === "database") {
    try {
      return await getPostgresDashboardData();
    } catch (err) {
      if (isDatabaseRequired()) throw err;
      console.error("Postgres dashboard query failed, falling back:", err);
    }
  }

  if (mode === "supabase" || (mode === "database" && !isDatabaseRequired())) {
    const hasSupabase = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    if (hasSupabase) {
      try {
        return await getSupabaseDashboardData();
      } catch {
        // Fall back to seed data if Supabase query fails
      }
    }
  }

  return getSeedDashboardData();
}

function getSeedDashboardData(): DashboardData {
  const latestWeek = WEEKS[WEEKS.length - 1];
  const reports = buildSeedReports();

  const cities: CityDashboardData[] = CITIES.map((city) => {
    const history = buildSeedSnapshots(city.slug);
    const spotlights = buildSeedSpotlights(city.slug);
    const current = history[history.length - 1] ?? null;
    const previous = history.length >= 2 ? history[history.length - 2] : null;
    const spotlight = spotlights.find((s) => s.week_of === latestWeek) ?? null;

    return {
      city,
      currentSnapshot: current,
      previousSnapshot: previous,
      spotlight,
      history,
    };
  });

  const seedNews: IndustryNewsItem[] = (INDUSTRY_NEWS[latestWeek] ?? []).map(
    (n, i) => ({
      ...n,
      id: `news-${latestWeek}-${i}`,
    }),
  );

  return {
    cities,
    latestReport: reports.find((r) => r.week_of === latestWeek) ?? null,
    news: seedNews,
    weekOf: latestWeek,
  };
}

async function getPostgresDashboardData(): Promise<DashboardData> {
  const { query } = await import("./db");

  const citiesRes = await query<Record<string, unknown>>(
    `SELECT id, name, state, slug, lat, lng FROM cities ORDER BY name`,
  );
  if (!citiesRes.rows.length) {
    if (isDatabaseRequired()) {
      throw new Error("Postgres cities table is empty");
    }
    return getSeedDashboardData();
  }

  const [snapshotsRes, spotlightsRes, reportRes] = await Promise.all([
    query<Record<string, unknown>>(
      `SELECT * FROM bpi_snapshots ORDER BY week_of ASC`,
    ),
    query<Record<string, unknown>>(
      `SELECT * FROM burger_spotlight ORDER BY week_of DESC`,
    ),
    query<Record<string, unknown>>(
      `SELECT * FROM market_reports ORDER BY week_of DESC LIMIT 1`,
    ),
  ]);

  const allSnapshots = snapshotsRes.rows.map(mapSnapshot);
  const allSpotlights = spotlightsRes.rows.map(mapSpotlight);

  const snapshotsByCity = new Map<string, BpiSnapshot[]>();
  for (const s of allSnapshots) {
    const arr = snapshotsByCity.get(s.city_id) ?? [];
    arr.push(s);
    snapshotsByCity.set(s.city_id, arr);
  }

  const spotlightByCity = new Map<string, BurgerSpotlight>();
  for (const s of allSpotlights) {
    if (!spotlightByCity.has(s.city_id)) {
      spotlightByCity.set(s.city_id, s);
    }
  }

  const cities: CityDashboardData[] = citiesRes.rows.map((row) => {
    const city = mapCity(row);
    const history = snapshotsByCity.get(city.id) ?? [];
    const current = history[history.length - 1] ?? null;
    const previous = history.length >= 2 ? history[history.length - 2] : null;

    return {
      city,
      currentSnapshot: current,
      previousSnapshot: previous,
      spotlight: spotlightByCity.get(city.id) ?? null,
      history,
    };
  });

  const latestWeek =
    cities[0]?.currentSnapshot?.week_of ??
    new Date().toISOString().split("T")[0];

  const newsRes = await query<Record<string, unknown>>(
    `SELECT * FROM industry_news WHERE week_of = $1::date ORDER BY created_at ASC`,
    [latestWeek],
  );

  return {
    cities,
    latestReport: reportRes.rows[0] ? mapReport(reportRes.rows[0]) : null,
    news: newsRes.rows.map(mapNews),
    weekOf: latestWeek,
  };
}

/**
 * Get all cities with their latest BPI data (for cities index and leaderboard).
 */
export async function getAllCities(): Promise<CityDashboardData[]> {
  const mode = resolveDataMode();

  if (mode === "database") {
    try {
      const { query } = await import("./db");
      const [citiesRes, snapshotsRes] = await Promise.all([
        query<Record<string, unknown>>(
          `SELECT id, name, state, slug, lat, lng FROM cities ORDER BY name`,
        ),
        query<Record<string, unknown>>(
          `SELECT * FROM bpi_snapshots ORDER BY week_of ASC`,
        ),
      ]);
      if (!citiesRes.rows.length) return [];

      const snapshotsByCity = new Map<string, BpiSnapshot[]>();
      for (const s of snapshotsRes.rows.map(mapSnapshot)) {
        const arr = snapshotsByCity.get(s.city_id) ?? [];
        arr.push(s);
        snapshotsByCity.set(s.city_id, arr);
      }

      return citiesRes.rows.map((row) => {
        const city = mapCity(row);
        const history = snapshotsByCity.get(city.id) ?? [];
        const current = history[history.length - 1] ?? null;
        const previous =
          history.length >= 2 ? history[history.length - 2] : null;

        return {
          city,
          currentSnapshot: current,
          previousSnapshot: previous,
          spotlight: null,
          history,
        };
      });
    } catch (err) {
      if (isDatabaseRequired()) throw err;
      console.error("Postgres getAllCities failed:", err);
    }
  }

  if (
    mode === "supabase" ||
    (resolveDataMode() !== "database" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    const hasSupabase = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    if (hasSupabase) {
      try {
        const { supabase } = await import("./supabase");
        const [citiesRes, snapshotsRes] = await Promise.all([
          supabase.from("cities").select("*").order("name"),
          supabase
            .from("bpi_snapshots")
            .select("*")
            .order("week_of", { ascending: true }),
        ]);
        const citiesData = citiesRes.data;
        if (!citiesData || citiesData.length === 0) return [];

        const snapshotsByCity = new Map<string, BpiSnapshot[]>();
        for (const s of (snapshotsRes.data ?? []) as BpiSnapshot[]) {
          const arr = snapshotsByCity.get(s.city_id) ?? [];
          arr.push(s);
          snapshotsByCity.set(s.city_id, arr);
        }

        return citiesData.map((city: City) => {
          const history = snapshotsByCity.get(city.id) ?? [];
          const current = history[history.length - 1] ?? null;
          const previous =
            history.length >= 2 ? history[history.length - 2] : null;

          return {
            city,
            currentSnapshot: current,
            previousSnapshot: previous,
            spotlight: null,
            history,
          };
        });
      } catch {
        // fall through
      }
    }
  }

  // Seed fallback
  return CITIES.map((city) => {
    const history = buildSeedSnapshots(city.slug);
    const current = history[history.length - 1] ?? null;
    const previous = history.length >= 2 ? history[history.length - 2] : null;
    return {
      city,
      currentSnapshot: current,
      previousSnapshot: previous,
      spotlight: null,
      history,
    };
  });
}

/**
 * Get data for a single city by slug.
 */
export async function getCityBySlug(
  slug: string,
): Promise<CityDashboardData | null> {
  const mode = resolveDataMode();

  if (mode === "database") {
    try {
      const { query } = await import("./db");
      const cityRes = await query<Record<string, unknown>>(
        `SELECT id, name, state, slug, lat, lng FROM cities WHERE slug = $1 LIMIT 1`,
        [slug],
      );
      if (!cityRes.rows[0]) return null;
      const city = mapCity(cityRes.rows[0]);

      const snapshotsRes = await query<Record<string, unknown>>(
        `SELECT * FROM bpi_snapshots WHERE city_id = $1 ORDER BY week_of ASC`,
        [city.id],
      );
      const history = snapshotsRes.rows.map(mapSnapshot);
      const current = history[history.length - 1] ?? null;
      const previous = history.length >= 2 ? history[history.length - 2] : null;

      const spotlightRes = await query<Record<string, unknown>>(
        `SELECT * FROM burger_spotlight WHERE city_id = $1 ORDER BY week_of DESC LIMIT 1`,
        [city.id],
      );

      return {
        city,
        currentSnapshot: current,
        previousSnapshot: previous,
        spotlight: spotlightRes.rows[0]
          ? mapSpotlight(spotlightRes.rows[0])
          : null,
        history,
      };
    } catch (err) {
      if (isDatabaseRequired()) throw err;
      console.error("Postgres getCityBySlug failed:", err);
    }
  }

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (hasSupabase && mode !== "database") {
    try {
      const { supabase } = await import("./supabase");
      const { data: city } = await supabase
        .from("cities")
        .select("*")
        .eq("slug", slug)
        .single();
      if (!city) return null;

      const { data: snapshots } = await supabase
        .from("bpi_snapshots")
        .select("*")
        .eq("city_id", city.id)
        .order("week_of", { ascending: true });

      const history = (snapshots ?? []) as BpiSnapshot[];
      const current = history[history.length - 1] ?? null;
      const previous = history.length >= 2 ? history[history.length - 2] : null;

      const { data: spotlightData } = await supabase
        .from("burger_spotlight")
        .select("*")
        .eq("city_id", city.id)
        .order("week_of", { ascending: false })
        .limit(1)
        .single();

      return {
        city: city as City,
        currentSnapshot: current,
        previousSnapshot: previous,
        spotlight: (spotlightData as BurgerSpotlight) ?? null,
        history,
      };
    } catch {
      // fall through
    }
  }

  // Seed fallback
  const seedCity = CITIES.find((c) => c.slug === slug);
  if (!seedCity) return null;
  const history = buildSeedSnapshots(seedCity.slug);
  const current = history[history.length - 1] ?? null;
  const previous = history.length >= 2 ? history[history.length - 2] : null;
  return {
    city: seedCity,
    currentSnapshot: current,
    previousSnapshot: previous,
    spotlight: null,
    history,
  };
}

/**
 * Get all city slugs (for static generation).
 */
export async function getAllCitySlugs(): Promise<string[]> {
  const mode = resolveDataMode();

  if (mode === "database") {
    try {
      const { query } = await import("./db");
      const res = await query<{ slug: string }>(`SELECT slug FROM cities`);
      if (res.rows.length) return res.rows.map((c) => c.slug);
    } catch (err) {
      if (isDatabaseRequired()) throw err;
      console.error("Postgres getAllCitySlugs failed:", err);
    }
  }

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (hasSupabase && mode !== "database") {
    try {
      const { supabase } = await import("./supabase");
      const { data } = await supabase.from("cities").select("slug");
      if (data) return data.map((c: { slug: string }) => c.slug);
    } catch {
      // fall through
    }
  }

  return CITIES.map((c) => c.slug);
}

async function getSupabaseDashboardData(): Promise<DashboardData> {
  const { supabase } = await import("./supabase");

  // Fetch cities, all snapshots, all spotlights, report, and news in parallel
  const { data: citiesData } = await supabase
    .from("cities")
    .select("*")
    .order("name");
  if (!citiesData || citiesData.length === 0) return getSeedDashboardData();

  const [snapshotsRes, spotlightsRes, reportRes] = await Promise.all([
    supabase
      .from("bpi_snapshots")
      .select("*")
      .order("week_of", { ascending: true }),
    supabase
      .from("burger_spotlight")
      .select("*")
      .order("week_of", { ascending: false }),
    supabase
      .from("market_reports")
      .select("*")
      .order("week_of", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const allSnapshots = (snapshotsRes.data ?? []) as BpiSnapshot[];
  const allSpotlights = (spotlightsRes.data ?? []) as BurgerSpotlight[];

  // Group by city in-memory
  const snapshotsByCity = new Map<string, BpiSnapshot[]>();
  for (const s of allSnapshots) {
    const arr = snapshotsByCity.get(s.city_id) ?? [];
    arr.push(s);
    snapshotsByCity.set(s.city_id, arr);
  }

  const spotlightByCity = new Map<string, BurgerSpotlight>();
  for (const s of allSpotlights) {
    if (!spotlightByCity.has(s.city_id)) {
      spotlightByCity.set(s.city_id, s);
    }
  }

  const cities: CityDashboardData[] = citiesData.map((city: City) => {
    const history = snapshotsByCity.get(city.id) ?? [];
    const current = history[history.length - 1] ?? null;
    const previous = history.length >= 2 ? history[history.length - 2] : null;

    return {
      city,
      currentSnapshot: current,
      previousSnapshot: previous,
      spotlight: spotlightByCity.get(city.id) ?? null,
      history,
    };
  });

  const latestWeek =
    cities[0]?.currentSnapshot?.week_of ??
    new Date().toISOString().split("T")[0];

  // Fetch news for the latest week
  const { data: newsData } = await supabase
    .from("industry_news")
    .select("*")
    .eq("week_of", latestWeek)
    .order("created_at", { ascending: true });

  return {
    cities,
    latestReport: (reportRes.data as MarketReport) ?? null,
    news: (newsData as IndustryNewsItem[]) ?? [],
    weekOf: latestWeek,
  };
}

/**
 * Compute national BPI history: average BPI across all cities per week.
 */
export function getNationalBpiHistory(
  cities: CityDashboardData[],
): NationalBpiPoint[] {
  const weekMap = new Map<string, { total: number; count: number }>();

  for (const city of cities) {
    for (const snap of city.history) {
      const entry = weekMap.get(snap.week_of) ?? { total: 0, count: 0 };
      entry.total += snap.bpi_score;
      entry.count += 1;
      weekMap.set(snap.week_of, entry);
    }
  }

  return Array.from(weekMap.entries())
    .map(([week_of, { total, count }]) => ({
      week_of,
      avg_bpi: Math.round((total / count) * 100) / 100,
      city_count: count,
    }))
    .sort((a, b) => a.week_of.localeCompare(b.week_of));
}

/**
 * Get the top 3 cheapest and top 3 most expensive burgers from the current week.
 */
export function getSpreadData(cities: CityDashboardData[]): {
  cheapest: SpreadEntry[];
  mostExpensive: SpreadEntry[];
} {
  const entries: { cheap: SpreadEntry; expensive: SpreadEntry }[] = [];

  for (const c of cities) {
    const snap = c.currentSnapshot;
    if (!snap) continue;

    entries.push({
      cheap: {
        city: c.city.name,
        state: c.city.state,
        restaurant: snap.cheapest_restaurant || "Unknown",
        price: snap.cheapest_price,
      },
      expensive: {
        city: c.city.name,
        state: c.city.state,
        restaurant: snap.most_expensive_restaurant || "Unknown",
        price: snap.most_expensive_price,
      },
    });
  }

  const cheapest = entries
    .map((e) => e.cheap)
    .filter((e) => e.price > 0)
    .sort((a, b) => a.price - b.price || a.city.localeCompare(b.city))
    .slice(0, 3);

  const mostExpensive = entries
    .map((e) => e.expensive)
    .sort((a, b) => b.price - a.price || a.city.localeCompare(b.city))
    .slice(0, 3);

  return { cheapest, mostExpensive };
}

/**
 * Get purchasing power data for the latest week.
 */
export async function getPurchasingPower(): Promise<PurchasingPowerEntry[]> {
  const mode = resolveDataMode();

  if (mode === "database") {
    try {
      const { query } = await import("./db");

      const weeksRes = await query<{ week_of: string }>(
        `SELECT week_of::text AS week_of FROM purchasing_power ORDER BY week_of DESC`,
      );
      if (!weeksRes.rows.length) return [];

      const weekCounts = new Map<string, number>();
      for (const row of weeksRes.rows) {
        const w = dateStr(row.week_of);
        weekCounts.set(w, (weekCounts.get(w) ?? 0) + 1);
      }
      const bestWeek = Array.from(weekCounts.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .find(([, count]) => count >= 3)?.[0];
      if (!bestWeek) return [];

      const dataRes = await query<Record<string, unknown>>(
        `SELECT pp.min_wage, pp.avg_bpi, pp.burgers_per_hour,
                c.name AS city_name, c.state, c.slug
         FROM purchasing_power pp
         JOIN cities c ON c.id::text = pp.city_id::text
         WHERE pp.week_of = $1::date
         ORDER BY pp.burgers_per_hour DESC`,
        [bestWeek],
      );

      return dataRes.rows.map((row) => ({
        city: String(row.city_name),
        state: String(row.state),
        slug: String(row.slug),
        min_wage: num(row.min_wage),
        avg_bpi: num(row.avg_bpi),
        burgers_per_hour: num(row.burgers_per_hour),
      }));
    } catch (err) {
      if (isDatabaseRequired()) {
        console.error("Purchasing power Postgres query error:", err);
        return [];
      }
      console.error("Purchasing power Postgres query error:", err);
      return [];
    }
  }

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!hasSupabase) return [];

  try {
    const { supabase } = await import("./supabase");

    // Get the most recent week that has at least 3 cities
    const { data: allRows } = await supabase
      .from("purchasing_power")
      .select("week_of")
      .order("week_of", { ascending: false });

    if (!allRows || allRows.length === 0) return [];

    // Count cities per week, pick the most recent with 3+ cities
    const weekCounts = new Map<string, number>();
    for (const row of allRows) {
      weekCounts.set(row.week_of, (weekCounts.get(row.week_of) ?? 0) + 1);
    }
    const bestWeek = Array.from(weekCounts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .find(([, count]) => count >= 3)?.[0];

    if (!bestWeek) return [];
    const latest = { week_of: bestWeek };

    const { data, error } = await supabase
      .from("purchasing_power")
      .select(
        "city_id, week_of, min_wage, avg_bpi, burgers_per_hour, wage_source, cities(name, state, slug)",
      )
      .eq("week_of", latest.week_of)
      .order("burgers_per_hour", { ascending: false });

    if (error) {
      console.error("Purchasing power query error:", error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: Record<string, unknown>) => {
      const city = row.cities as { name: string; state: string; slug: string };
      return {
        city: city.name,
        state: city.state,
        slug: city.slug,
        min_wage: Number(row.min_wage),
        avg_bpi: Number(row.avg_bpi),
        burgers_per_hour: Number(row.burgers_per_hour),
      };
    });
  } catch {
    return [];
  }
}
