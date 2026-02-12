import type {
  DashboardData,
  CityDashboardData,
  BpiSnapshot,
  BurgerSpotlight,
  MarketReport,
  IndustryNewsItem,
  City,
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
  { id: "boston", name: "Boston", state: "MA", slug: "boston-ma" },
  { id: "seattle", name: "Seattle", state: "WA", slug: "seattle-wa" },
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

async function getSupabaseDashboardData(): Promise<DashboardData> {
  const { supabase } = await import("./supabase");

  // Get cities
  const { data: citiesData } = await supabase
    .from("cities")
    .select("*")
    .order("name");
  if (!citiesData || citiesData.length === 0) return getSeedDashboardData();

  const cities: CityDashboardData[] = await Promise.all(
    citiesData.map(async (city: City) => {
      // Get snapshots ordered by week
      const { data: snapshots } = await supabase
        .from("bpi_snapshots")
        .select("*")
        .eq("city_id", city.id)
        .order("week_of", { ascending: true });

      const history = (snapshots ?? []) as BpiSnapshot[];
      const current = history[history.length - 1] ?? null;
      const previous = history.length >= 2 ? history[history.length - 2] : null;

      // Get latest spotlight
      const { data: spotlightData } = await supabase
        .from("burger_spotlight")
        .select("*")
        .eq("city_id", city.id)
        .order("week_of", { ascending: false })
        .limit(1)
        .single();

      return {
        city,
        currentSnapshot: current,
        previousSnapshot: previous,
        spotlight: (spotlightData as BurgerSpotlight) ?? null,
        history,
      };
    }),
  );

  // Get latest report
  const { data: reportData } = await supabase
    .from("market_reports")
    .select("*")
    .order("week_of", { ascending: false })
    .limit(1)
    .single();

  const latestWeek =
    cities[0]?.currentSnapshot?.week_of ??
    new Date().toISOString().split("T")[0];

  // Get industry news for latest week
  const { data: newsData } = await supabase
    .from("industry_news")
    .select("*")
    .eq("week_of", latestWeek)
    .order("created_at", { ascending: true });

  return {
    cities,
    latestReport: (reportData as MarketReport) ?? null,
    news: (newsData as IndustryNewsItem[]) ?? [],
    weekOf: latestWeek,
  };
}
