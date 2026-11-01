import { getAllCities } from "@/lib/data";

export const dynamic = "force-dynamic";

const base = (process.env.NEXT_PUBLIC_BASE_URL || "https://burgerprice.com").replace(/\/$/, "");

/**
 * Full weekly BPI history as JSON (CC BY 4.0), the machine-readable twin of
 * /data/bpi.csv. One entry per city with its weekly history, oldest first.
 * `?city=<slug>` narrows to one market; an unknown slug returns 404.
 * CORS-open so dashboards and notebooks can fetch it straight from a browser.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const citySlug = url.searchParams.get("city")?.trim() || null;
  const allCities = await getAllCities();
  const cities = citySlug
    ? allCities.filter(({ city }) => city.slug === citySlug)
    : allCities;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  };
  if (citySlug && cities.length === 0) {
    return new Response(JSON.stringify({ error: "Unknown city" }) + "\n", {
      status: 404,
      headers,
    });
  }

  const markets = [...cities]
    .sort((a, b) => a.city.name.localeCompare(b.city.name))
    .map(({ city, history }) => ({
      slug: city.slug,
      city: city.name,
      state: city.state,
      url: `${base}/cities/${city.slug}`,
      history: [...history]
        .sort((a, b) => a.week_of.localeCompare(b.week_of))
        .map((s) => ({
          week_of: s.week_of,
          bpi_score: s.bpi_score,
          change_pct: s.change_pct,
          avg_price: s.avg_price,
          cheapest_price: s.cheapest_price,
          cheapest_restaurant: s.cheapest_restaurant,
          most_expensive_price: s.most_expensive_price,
          most_expensive_restaurant: s.most_expensive_restaurant,
          sample_size: s.sample_size,
        })),
    }));
  const latestWeek = markets
    .flatMap((m) => m.history.map((h) => h.week_of))
    .sort()
    .at(-1) ?? null;

  const body = {
    name: "Burger Price Index",
    source: `${base}/about#data-sources`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Burger Price Index (burgerprice.com)",
    latest_week: latestWeek,
    csv: citySlug
      ? `${base}/data/bpi.csv?city=${encodeURIComponent(citySlug)}`
      : `${base}/data/bpi.csv`,
    cities: markets,
  };

  return new Response(JSON.stringify(body, null, 2) + "\n", {
    headers: {
      ...headers,
      "Cache-Control": "public, max-age=900, s-maxage=3600",
    },
  });
}
