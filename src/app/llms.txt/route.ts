import { getAllCities, getNationalBpiHistory } from "@/lib/data";
import {
  formatCityLlmsLine,
  formatNationalBpiLine,
  ranksPriciestFirst,
  recordDirectionsBySlug,
} from "@/lib/llms-txt";

export const dynamic = "force-dynamic";

const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://burgerprice.com").replace(/\/$/, "");

/**
 * /llms.txt — a plain-text map of the site for AI assistants and answer
 * engines (llmstxt.org format): what the BPI is, how it's built, where the
 * pages and open data live, and the latest print per city, straight from the DB.
 *
 * History comes from the single getAllCities snapshot query (the same bulk
 * read /rankings and /data/bpi.json use). Rank, range, and records are
 * computed from that array. A missing print or a short tape drops that
 * clause instead of failing the document.
 */
export async function GET() {
  const cities = await getAllCities();
  const latestWeek = cities
    .map((c) => c.currentSnapshot?.week_of)
    .filter((w): w is string => Boolean(w))
    .sort()
    .at(-1);

  const nationalLine = formatNationalBpiLine(
    getNationalBpiHistory(cities),
    cities.map(({ city, currentSnapshot }) => ({
      name: city.name,
      state: city.state,
      slug: city.slug,
      bpi: currentSnapshot?.bpi_score ?? null,
      weekOf: currentSnapshot?.week_of ?? null,
    })),
  );
  const ranks = ranksPriciestFirst(cities);
  const records = latestWeek
    ? recordDirectionsBySlug(cities, latestWeek)
    : new Map<string, "high" | "low">();

  const cityLines = cities
    .map(({ city, currentSnapshot, history }) =>
      formatCityLlmsLine({
        name: city.name,
        state: city.state,
        url: `${baseUrl}/cities/${city.slug}`,
        csvUrl: `${baseUrl}/data/bpi.csv?city=${city.slug}`,
        snapshot: currentSnapshot,
        history,
        rank: ranks.get(city.slug) ?? null,
        record: records.get(city.slug) ?? null,
      }),
    )
    .join("\n");

  const printLines = [
    `Latest print: ${latestWeek ? `week of ${latestWeek}` : "none yet"}. Weeks start on Monday; a new print lands each Monday.`,
  ];
  if (nationalLine) printLines.push(nationalLine);

  const body = `# Burger Price Index

> The Burger Price Index (BPI) tracks what a burger costs in ${cities.length} US cities, every week. Each city's BPI is a weighted average of surveyed burger prices: fast food 20%, casual/diner 40%, premium/gourmet 40%, from roughly 10-15 restaurants per city. Data is free to reuse under CC BY 4.0 with attribution to burgerprice.com. The BPI is entertainment and information, not investment advice.

${printLines.join("\n")}

## Key pages

- [Home dashboard](${baseUrl}/): national BPI, this week's movers, and the price spread across cities
- [Rankings](${baseUrl}/rankings): every city ranked by current-week BPI, priciest first
- [All cities](${baseUrl}/cities): the market list with links to each city page
- [About and methodology](${baseUrl}/about): how prices are sampled and weighted, the same-store check, and the FAQ
- [Weekly newsletter archive](${baseUrl}/newsletter): one issue per weekly print
- [RSS feed](${baseUrl}/feed.xml): new weekly issues

## Open data

- [Full BPI history CSV](${baseUrl}/data/bpi.csv): one row per city per week, CC BY 4.0
- Per-city CSV: ${baseUrl}/data/bpi.csv?city=<slug>
- [Full BPI history JSON](${baseUrl}/data/bpi.json): same data grouped by city, CORS-open; add ?city=<slug> for one market

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
