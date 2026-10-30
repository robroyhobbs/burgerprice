import { getAllCities } from "@/lib/data";

export const dynamic = "force-dynamic";

const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://burgerprice.com").replace(/\/$/, "");

function money(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? `$${n.toFixed(2)}` : "n/a";
}

function pct(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "no prior week";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}% week over week`;
}

/**
 * /llms.txt — a plain-text map of the site for AI assistants and answer
 * engines (llmstxt.org format): what the BPI is, how it's built, where the
 * pages and open data live, and the latest print per city, straight from the DB.
 */
export async function GET() {
  const cities = await getAllCities();
  const latestWeek = cities
    .map((c) => c.currentSnapshot?.week_of)
    .filter((w): w is string => Boolean(w))
    .sort()
    .at(-1);

  const cityLines = cities
    .map(({ city, currentSnapshot: s }) => {
      const url = `${baseUrl}/cities/${city.slug}`;
      if (!s) return `- [${city.name}, ${city.state}](${url}): no print yet`;
      return `- [${city.name}, ${city.state}](${url}): BPI ${money(s.bpi_score)} for the week of ${s.week_of} (${pct(s.change_pct)}); cheapest ${money(s.cheapest_price)} at ${s.cheapest_restaurant}, priciest ${money(s.most_expensive_price)} at ${s.most_expensive_restaurant}; ${s.sample_size} restaurants sampled. CSV: ${baseUrl}/data/bpi.csv?city=${city.slug}`;
    })
    .join("\n");

  const body = `# Burger Price Index

> The Burger Price Index (BPI) tracks what a burger costs in ${cities.length} US cities, every week. Each city's BPI is a weighted average of surveyed burger prices: fast food 20%, casual/diner 40%, premium/gourmet 40%, from roughly 10-15 restaurants per city. Data is free to reuse under CC BY 4.0 with attribution to burgerprice.com. The BPI is entertainment and information, not investment advice.

Latest print: ${latestWeek ? `week of ${latestWeek}` : "none yet"}. Weeks start on Monday; a new print lands each Monday.

## Key pages

- [Home dashboard](${baseUrl}/): national BPI, this week's movers, and the price spread across cities
- [Rankings](${baseUrl}/rankings): every city ranked from cheapest to priciest burger
- [All cities](${baseUrl}/cities): the market list with links to each city page
- [About and methodology](${baseUrl}/about): how prices are sampled and weighted, the same-store check, and the FAQ
- [Weekly newsletter archive](${baseUrl}/newsletter): one issue per weekly print
- [RSS feed](${baseUrl}/feed.xml): new weekly issues

## Open data

- [Full BPI history CSV](${baseUrl}/data/bpi.csv): one row per city per week, CC BY 4.0
- Per-city CSV: ${baseUrl}/data/bpi.csv?city=<slug>

## Cities (latest print)

${cityLines}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=3600",
    },
  });
}
