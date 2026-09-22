import Link from "next/link";
import { getAllCities, getNationalBpiHistory } from "@/lib/data";
import { CitiesIndex } from "@/components/cities-index";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ShareStrip } from "@/components/share-strip";
import { getSiteBaseUrl } from "@/lib/json-ld";
import {
  buildCitiesCaption,
  citiesOgPath,
  citiesShareUrl,
} from "@/lib/share";
import type { Metadata } from "next";
import type { CityDashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const TITLE = "All Cities | Burger Price Index";
const DESCRIPTION =
  "Compare burger prices across US cities. Find the most and least expensive cities for burgers — weekly BPI rankings, near-me discovery, and city showdowns.";
const canonical = `${getSiteBaseUrl()}/cities`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical },
  openGraph: {
    title: TITLE,
    description:
      "Ranked BPI across US cities. Click through for restaurant prices, trends, and national comparison.",
    url: canonical,
    images: [
      {
        url: citiesOgPath(),
        width: 1200,
        height: 630,
        alt: "Burger Price Index — all cities share card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Ranked BPI across US cities. Click through for restaurant prices, trends, and national comparison.",
    images: [citiesOgPath()],
  },
};

const FAQ_ITEMS = [
  {
    q: "How is the city grid ordered?",
    a: "By current-week BPI, highest to lowest. Cities without a print yet sink to the bottom. Same sort as the rankings table — grid layout, not rows.",
  },
  {
    q: "What does each city card show?",
    a: "City name and state, rank among tracked cities, current BPI dollars, and week-over-week change when we have one. Tap through for restaurant prices and trends.",
  },
  {
    q: "How do I find my city or request a new one?",
    a: "Use search or Near Me on this page. Missing a market? Submit a request on the form below the grid — cities with 25+ asks get added to the index.",
  },
  {
    q: "What's the difference between /cities and /rankings?",
    a: "/cities is the card grid with search and near-me. /rankings is the weekly leaderboard table with national print, biggest movers, and high/low callouts. Same BPI, two views.",
  },
  {
    q: "How often do city BPIs update?",
    a: "Weekly. After each collection run clears, every tracked city gets a fresh score and the grid reshuffles.",
  },
];

type RankedCity = CityDashboardData & { bpi: number | null };

function rankCities(cities: CityDashboardData[]): RankedCity[] {
  return [...cities]
    .map((c) => ({
      ...c,
      bpi: c.currentSnapshot?.bpi_score ?? null,
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
  const pageUrl = `${base}/cities`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Burger Price Index — All Cities",
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

export default async function CitiesPage() {
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

  const withBpi = ranked.filter(
    (c): c is RankedCity & { bpi: number } => c.bpi !== null,
  );
  const premium = withBpi[0] ?? null;
  const value = withBpi.length > 0 ? withBpi[withBpi.length - 1] : null;

  const jsonLd = buildJsonLd(ranked, weekOf);

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
        {nationalCurrent && weekOf && (
          <section className="max-w-7xl mx-auto px-6 pt-6 pb-0">
            <ShareStrip
              shareUrl={citiesShareUrl()}
              caption={buildCitiesCaption({
                weekOf,
                avgBpi: nationalCurrent.avg_bpi,
                changePct: nationalChange,
                cityCount: nationalCurrent.city_count,
                premiumCity: premium?.city.name ?? null,
                premiumBpi: premium?.bpi ?? null,
                valueCity: value?.city.name ?? null,
                valueBpi: value?.bpi ?? null,
              })}
              label="Share the city grid"
            />
          </section>
        )}
        <CitiesIndex cities={cities} />

        {/* FAQ */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard mb-6">
            Cities FAQ
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
          <p className="text-xs text-gray-400 mt-6">
            Prefer the table?{" "}
            <Link
              href="/rankings"
              className="text-ketchup dark:text-mustard hover:underline"
            >
              Weekly rankings
            </Link>
            . Methodology lives on{" "}
            <Link
              href="/about"
              className="text-ketchup dark:text-mustard hover:underline"
            >
              About
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
