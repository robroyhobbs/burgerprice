import Link from "next/link";
import {
  getDashboardData,
  getNationalBpiHistory,
  getSpreadData,
  getPurchasingPower,
} from "@/lib/data";
import { Header } from "@/components/header";
import { NationalBpi } from "@/components/national-bpi";
import { BpiExplainer } from "@/components/bpi-explainer";
import { CityShowdown } from "@/components/city-showdown";
import { Leaderboard } from "@/components/leaderboard";
import { CandlestickChart } from "@/components/candlestick-chart";
import { MarketReport } from "@/components/market-report";
import { IndustryNews } from "@/components/industry-news";
import { NewsletterForm } from "@/components/newsletter-form";
import { TheSpread } from "@/components/the-spread";
import { PurchasingPower } from "@/components/purchasing-power";
import { FindYourCity } from "@/components/find-your-city";
import { Footer } from "@/components/footer";
import { getShowdownIndices, parseShowdownPair } from "@/lib/showdown";
import { showdownOgPath } from "@/lib/share";
import {
  buildFaqPageJsonLd,
  buildShowdownFaqItems,
} from "@/lib/json-ld";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface HomeProps {
  searchParams: Promise<{ showdown?: string }>;
}

export async function generateMetadata({
  searchParams,
}: HomeProps): Promise<Metadata> {
  const sp = await searchParams;
  const raw = sp.showdown;
  // Always declare apex homepage as canonical (fixes GSC duplicate www/apex).
  const canonical = "/";
  if (raw == null || raw === "") {
    // Explicit images required: a bare openGraph override drops layout images,
    // which left the live homepage without og:image (hurts FB/iMessage/LinkedIn shares).
    const ogImage = "/api/og";
    return {
      alternates: { canonical },
      openGraph: {
        url: canonical,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: "Burger Price Index — national BPI share card",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        images: [ogImage],
      },
    };
  }

  const pair = parseShowdownPair(raw, null, null);
  const ogImage = pair
    ? showdownOgPath(pair[0], pair[1])
    : showdownOgPath();

  const title = "Weekly City Showdown | Burger Price Index";
  const description =
    "This week's head-to-head BPI matchup. Bloomberg Terminal energy, Wendy's drive-thru prices.";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "Weekly BPI City Showdown",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function Home({ searchParams }: HomeProps) {
  // searchParams reserved for showdown OG share URLs (?showdown=1|slug,slug)
  await searchParams;

  const [data, purchasingPower] = await Promise.all([
    getDashboardData(),
    getPurchasingPower(),
  ]);
  const nationalHistory = getNationalBpiHistory(data.cities);
  const spread = getSpreadData(data.cities);

  // Cheapest / priciest cities by current BPI (for national share caption)
  const rankedByBpi = data.cities
    .map((c) => ({
      name: c.city.name,
      bpi: c.currentSnapshot?.bpi_score ?? null,
    }))
    .filter((c): c is { name: string; bpi: number } => c.bpi != null)
    .sort((a, b) => a.bpi - b.bpi);
  const cheapestCity = rankedByBpi[0]?.name ?? null;
  const mostExpensiveCity =
    rankedByBpi.length > 0 ? rankedByBpi[rankedByBpi.length - 1].name : null;

  const nationalCurrent =
    nationalHistory.length > 0
      ? nationalHistory[nationalHistory.length - 1]
      : null;
  const nationalPrevious =
    nationalHistory.length >= 2
      ? nationalHistory[nationalHistory.length - 2]
      : null;
  const nationalChangePct =
    nationalCurrent && nationalPrevious && nationalPrevious.avg_bpi > 0
      ? ((nationalCurrent.avg_bpi - nationalPrevious.avg_bpi) /
          nationalPrevious.avg_bpi) *
        100
      : null;

  // Pick 2 showdown cities based on current week (deterministic rotation)
  const [idx1, idx2] = getShowdownIndices(data.weekOf, data.cities.length);
  const showdownCities = [data.cities[idx1], data.cities[idx2]].filter(Boolean);

  // For the trend chart, show the showdown pair
  const trendCities =
    showdownCities.length >= 2 ? showdownCities : data.cities.slice(0, 2);

  const showdownFaqItems =
    showdownCities.length >= 2
      ? buildShowdownFaqItems({
          weekOf: data.weekOf ?? nationalCurrent?.week_of ?? null,
          leftName: showdownCities[0].city.name,
          leftState: showdownCities[0].city.state,
          leftSlug: showdownCities[0].city.slug,
          leftBpi: showdownCities[0].currentSnapshot?.bpi_score ?? null,
          rightName: showdownCities[1].city.name,
          rightState: showdownCities[1].city.state,
          rightSlug: showdownCities[1].city.slug,
          rightBpi: showdownCities[1].currentSnapshot?.bpi_score ?? null,
          nationalAvg: nationalCurrent?.avg_bpi ?? null,
          cityCount: nationalCurrent?.city_count ?? data.cities.length,
          cheapestCity,
          mostExpensiveCity,
        })
      : [];
  const showdownFaqJsonLd =
    showdownFaqItems.length > 0
      ? buildFaqPageJsonLd(showdownFaqItems)
      : null;

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
      {showdownFaqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(showdownFaqJsonLd),
          }}
        />
      ) : null}
      <Header cities={data.cities} />
      <main className="space-y-6 md:space-y-10">
        <NationalBpi
          history={nationalHistory}
          cheapestCity={cheapestCity}
          mostExpensiveCity={mostExpensiveCity}
        />
        <BpiExplainer
          avgBpi={nationalCurrent?.avg_bpi ?? null}
          changePct={nationalChangePct}
          cityCount={nationalCurrent?.city_count ?? data.cities.length}
          cheapestCity={cheapestCity}
          mostExpensiveCity={mostExpensiveCity}
        />
        <CityShowdown cities={showdownCities} weekOf={data.weekOf} />

        {/* Showdown FAQ — mirrors FAQPage JSON-LD */}
        {showdownFaqItems.length > 0 ? (
          <section
            className="max-w-7xl mx-auto px-6 pb-4"
            aria-labelledby="showdown-faq"
          >
            <h2
              id="showdown-faq"
              className="font-headline text-2xl text-ketchup dark:text-mustard mb-6"
            >
              Showdown FAQ
            </h2>
            <div className="space-y-4">
              {showdownFaqItems.map((item) => (
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
              Dig into{" "}
              {showdownCities.length >= 2 ? (
                <>
                  <Link
                    href={`/cities/${showdownCities[0].city.slug}`}
                    className="text-ketchup dark:text-mustard hover:underline"
                  >
                    {showdownCities[0].city.name}
                  </Link>
                  {" or "}
                  <Link
                    href={`/cities/${showdownCities[1].city.slug}`}
                    className="text-ketchup dark:text-mustard hover:underline"
                  >
                    {showdownCities[1].city.name}
                  </Link>
                </>
              ) : (
                "either matchup city"
              )}
              , browse{" "}
              <Link
                href="/cities"
                className="text-ketchup dark:text-mustard hover:underline"
              >
                All Cities
              </Link>
              , or see methodology on{" "}
              <Link
                href="/about"
                className="text-ketchup dark:text-mustard hover:underline"
              >
                About
              </Link>
              .
            </p>
          </section>
        ) : null}

        <Leaderboard cities={data.cities} />
        <CandlestickChart cities={trendCities} />
        <MarketReport report={data.latestReport} />
        <IndustryNews news={data.news} />
        <TheSpread
          cheapest={spread.cheapest}
          mostExpensive={spread.mostExpensive}
        />
        <PurchasingPower data={purchasingPower} />
        <FindYourCity cities={data.cities.map((c) => c.city)} />
        <NewsletterForm />
      </main>
      <Footer />
    </div>
  );
}
