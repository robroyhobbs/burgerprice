import Link from "next/link";
import type { Metadata } from "next";
import { getAllCities, getNationalBpiHistory } from "@/lib/data";
import { getSiteBaseUrl } from "@/lib/json-ld";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Leaderboard } from "@/components/leaderboard";
import type { CityDashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const TITLE = "Weekly City Rankings | Burger Price Index";
const DESCRIPTION =
  "Weekly BPI leaderboard across US cities — national print, biggest movers, and high/low callouts. Bloomberg rigor. Wendy's frostiness.";
const canonical = `${getSiteBaseUrl()}/rankings`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: canonical,
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Burger Price Index — national BPI share card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/api/og"],
  },
};

const FAQ_ITEMS = [
  {
    q: "How are cities ranked?",
    a: "By current-week BPI score, highest to lowest. BPI is a weighted average of fast-food, casual, and gourmet burger prices in each city — same methodology every week.",
  },
  {
    q: "What does WoW mean?",
    a: "Week-over-week change in BPI. Green (down) means burgers got cheaper; red (up) means they got pricier. Flat weeks show a dash.",
  },
  {
    q: "How often does the leaderboard update?",
    a: "Every week. We reprint the national average and reshuffle the city table after the latest collection run clears.",
  },
  {
    q: "Where can I dig into a single city?",
    a: "Click any row for that city's full profile — restaurant prices, trends, and how it stacks up against the national print.",
  },
];

type RankedCity = CityDashboardData & {
  bpi: number | null;
  change: number | null;
};

function rankCities(cities: CityDashboardData[]): RankedCity[] {
  return [...cities]
    .map((c) => ({
      ...c,
      bpi: c.currentSnapshot?.bpi_score ?? null,
      change: c.currentSnapshot?.change_pct ?? null,
    }))
    .sort((a, b) => {
      if (a.bpi === null && b.bpi === null) return 0;
      if (a.bpi === null) return 1;
      if (b.bpi === null) return -1;
      return b.bpi - a.bpi;
    });
}

function buildJsonLd(
  ranked: RankedCity[],
  weekOf: string | null,
): Record<string, unknown>[] {
  const base = getSiteBaseUrl();
  const pageUrl = `${base}/rankings`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Weekly BPI City Rankings",
    description: DESCRIPTION,
    url: pageUrl,
    numberOfItems: ranked.filter((c) => c.bpi != null).length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: ranked
      .filter((c) => c.bpi != null)
      .map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${c.city.name}, ${c.city.state}`,
        url: `${base}/cities/${c.city.slug}`,
      })),
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const webpage: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "Burger Price Index",
      url: base,
    },
  };
  if (weekOf) webpage.dateModified = weekOf;

  return [webpage, itemList, faqPage];
}

export default async function RankingsPage() {
  const cities = await getAllCities();
  const ranked = rankCities(cities);
  const nationalHistory = getNationalBpiHistory(cities);
  const nationalCurrent =
    nationalHistory.length > 0
      ? nationalHistory[nationalHistory.length - 1]
      : null;
  const nationalPrevious =
    nationalHistory.length >= 2
      ? nationalHistory[nationalHistory.length - 2]
      : null;
  const nationalChange =
    nationalCurrent && nationalPrevious && nationalPrevious.avg_bpi > 0
      ? ((nationalCurrent.avg_bpi - nationalPrevious.avg_bpi) /
          nationalPrevious.avg_bpi) *
        100
      : null;

  const weekOf =
    nationalCurrent?.week_of ??
    cities.find((c) => c.currentSnapshot)?.currentSnapshot?.week_of ??
    null;

  const withChange = ranked.filter(
    (c): c is RankedCity & { change: number } =>
      c.change !== null && c.change !== 0,
  );
  const risers = [...withChange]
    .sort((a, b) => b.change - a.change)
    .slice(0, 3);
  const fallers = [...withChange]
    .sort((a, b) => a.change - b.change)
    .slice(0, 3);

  const withBpi = ranked.filter(
    (c): c is RankedCity & { bpi: number } => c.bpi !== null,
  );
  const highest = withBpi[0] ?? null;
  const lowest = withBpi.length > 0 ? withBpi[withBpi.length - 1] : null;

  const weekLabel = weekOf
    ? new Date(weekOf + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const jsonLd = buildJsonLd(ranked, weekOf);
  const natUp = nationalChange !== null && nationalChange > 0;
  const natDown = nationalChange !== null && nationalChange < 0;

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
      {jsonLd.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <Header cities={cities} />
      <main>
        {/* Hero + national print */}
        <section className="max-w-7xl mx-auto px-6 pt-10 pb-4">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-3">
            Weekly print
            {weekLabel ? ` · Week of ${weekLabel}` : ""}
          </p>
          <h1 className="font-headline text-3xl md:text-5xl text-ketchup dark:text-mustard mb-3">
            City Rankings
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mb-8">
            The full BPI leaderboard — who&apos;s richest on the bun, who
            cooled off, and where the national average sits this week.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-2">
                National BPI
              </p>
              <p className="bpi-number text-3xl font-bold text-gray-900 dark:text-white">
                {nationalCurrent
                  ? `$${nationalCurrent.avg_bpi.toFixed(2)}`
                  : "—"}
              </p>
              {nationalChange !== null && (
                <p
                  className={`bpi-number text-sm font-bold mt-1 ${
                    natUp
                      ? "text-negative dark:text-red-400"
                      : natDown
                        ? "text-lettuce dark:text-lettuce-light"
                        : "text-gray-400"
                  }`}
                >
                  {natUp ? "▲" : natDown ? "▼" : "—"}{" "}
                  {Math.abs(nationalChange).toFixed(1)}% WoW
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Avg across {nationalCurrent?.city_count ?? cities.length} cities
              </p>
            </div>

            <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-2">
                Highest BPI
              </p>
              {highest ? (
                <>
                  <Link
                    href={`/cities/${highest.city.slug}`}
                    className="font-headline text-xl text-gray-900 dark:text-white hover:text-ketchup dark:hover:text-mustard transition-colors"
                  >
                    {highest.city.name}
                    <span className="text-gray-400 font-body text-sm ml-1">
                      {highest.city.state}
                    </span>
                  </Link>
                  <p className="bpi-number text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    ${highest.bpi.toFixed(2)}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">—</p>
              )}
            </div>

            <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-2">
                Lowest BPI
              </p>
              {lowest ? (
                <>
                  <Link
                    href={`/cities/${lowest.city.slug}`}
                    className="font-headline text-xl text-gray-900 dark:text-white hover:text-ketchup dark:hover:text-mustard transition-colors"
                  >
                    {lowest.city.name}
                    <span className="text-gray-400 font-body text-sm ml-1">
                      {lowest.city.state}
                    </span>
                  </Link>
                  <p className="bpi-number text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    ${lowest.bpi.toFixed(2)}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">—</p>
              )}
            </div>
          </div>
        </section>

        {/* Movers */}
        {(risers.length > 0 || fallers.length > 0) && (
          <section className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
                📈
              </div>
              <div>
                <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
                  Biggest Movers
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Week-over-week BPI swings
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <MoverColumn
                title="Risers"
                subtitle="Prices heating up"
                items={risers}
                tone="up"
              />
              <MoverColumn
                title="Fallers"
                subtitle="Prices cooling off"
                items={fallers}
                tone="down"
              />
            </div>
          </section>
        )}

        {/* Full leaderboard */}
        <Leaderboard cities={cities} showFullPageLink={false} />

        <div className="max-w-7xl mx-auto px-6 pb-4 -mt-4">
          <p className="text-xs text-gray-400">
            Prefer the grid view?{" "}
            <Link
              href="/cities"
              className="text-ketchup dark:text-mustard hover:underline"
            >
              Browse all cities
            </Link>
            .
          </p>
        </div>

        {/* FAQ */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard mb-6">
            Rankings FAQ
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter px-5 py-4"
              >
                <summary className="cursor-pointer list-none font-medium text-sm text-gray-900 dark:text-white flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-gray-300 dark:text-gray-600 group-open:rotate-45 transition-transform text-lg leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function MoverColumn({
  title,
  subtitle,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  items: RankedCity[];
  tone: "up" | "down";
}) {
  return (
    <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-grill-lighter">
        <h3 className="font-headline text-lg text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-6 text-sm text-gray-400">No movers this week.</p>
      ) : (
        items.map((item) => {
          const isUp = (item.change ?? 0) > 0;
          return (
            <Link
              key={item.city.slug}
              href={`/cities/${item.city.slug}`}
              className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-50 dark:border-grill-lighter/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-grill transition-colors"
            >
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {item.city.name}
                  <span className="text-gray-400 ml-1">{item.city.state}</span>
                </p>
                <p className="bpi-number text-xs text-gray-400 mt-0.5">
                  {item.bpi != null ? `$${item.bpi.toFixed(2)}` : "—"}
                </p>
              </div>
              <span
                className={`bpi-number text-sm font-bold ${
                  tone === "up" || isUp
                    ? "text-negative dark:text-red-400"
                    : "text-lettuce dark:text-lettuce-light"
                }`}
              >
                {item.change != null
                  ? `${item.change > 0 ? "+" : ""}${item.change.toFixed(1)}%`
                  : "—"}
              </span>
            </Link>
          );
        })
      )}
    </div>
  );
}
