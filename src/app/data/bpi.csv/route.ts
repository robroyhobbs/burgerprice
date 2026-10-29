import { getAllCities } from "@/lib/data";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "week_of",
  "city",
  "state",
  "city_slug",
  "bpi_score",
  "change_pct",
  "avg_price",
  "cheapest_price",
  "cheapest_restaurant",
  "most_expensive_price",
  "most_expensive_restaurant",
  "sample_size",
] as const;

function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  // Neutralize spreadsheet formula injection, then quote when needed.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof value !== "number" ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Full weekly BPI history as CSV (CC BY 4.0). One row per city per week.
 * Linked from /about and declared as the Dataset distribution in JSON-LD.
 * `?city=<slug>` narrows to one market (linked from each city page);
 * an unknown slug returns 404.
 */
export async function GET(request: Request) {
  const citySlug = new URL(request.url).searchParams.get("city")?.trim() || null;
  const allCities = await getAllCities();
  const cities = citySlug
    ? allCities.filter(({ city }) => city.slug === citySlug)
    : allCities;
  if (citySlug && cities.length === 0) {
    return new Response("Unknown city\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const rows: string[] = [COLUMNS.join(",")];
  const filename = citySlug
    ? `burger-price-index-${citySlug}.csv`
    : "burger-price-index.csv";

  const all = cities.flatMap(({ city, history }) =>
    history.map((s) => ({ city, s })),
  );
  all.sort(
    (a, b) =>
      a.s.week_of.localeCompare(b.s.week_of) ||
      a.city.name.localeCompare(b.city.name),
  );

  for (const { city, s } of all) {
    rows.push(
      [
        s.week_of,
        city.name,
        city.state,
        city.slug,
        s.bpi_score,
        s.change_pct,
        s.avg_price,
        s.cheapest_price,
        s.cheapest_restaurant,
        s.most_expensive_price,
        s.most_expensive_restaurant,
        s.sample_size,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return new Response(`${rows.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=900, s-maxage=3600",
    },
  });
}
