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
 * Get dashboard data. Uses seed data if Supabase is not configured,
 * otherwise fetches from the database.
 */
export async function getDashboardData(): Promise<DashboardData> {
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

/**
 * Get all cities with their latest BPI data (for cities index and leaderboard).
 */
export async function getAllCities(): Promise<CityDashboardData[]> {
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
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (hasSupabase) {
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
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (hasSupabase) {
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
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!hasSupabase) return [];

  try {
    const { supabase } = await import("./supabase");

    // Get latest week_of
    const { data: latest } = await supabase
      .from("purchasing_power")
      .select("week_of")
      .order("week_of", { ascending: false })
      .limit(1)
      .single();

    if (!latest) return [];

    const { data } = await supabase
      .from("purchasing_power")
      .select("*, cities!inner(name, state, slug)")
      .eq("week_of", latest.week_of)
      .order("burgers_per_hour", { ascending: false });

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
