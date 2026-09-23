import Link from "next/link";
import { notFound } from "next/navigation";
import { getCityBySlug, getAllCities, getAllCitySlugs } from "@/lib/data";
import {
  buildCityFaqItems,
  buildCityPageJsonLd,
  buildFaqPageJsonLd,
  getSiteBaseUrl,
} from "@/lib/json-ld";
import { CityProfile, type PeerCity } from "@/components/city-profile";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface CityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCityBySlug(slug);
  if (!data) return { title: "City Not Found | Burger Price Index" };

  const bpi = data.currentSnapshot?.bpi_score;
  const change = data.currentSnapshot?.change_pct;
  const changeText =
    change == null
      ? ""
      : ` (${change > 0 ? "+" : ""}${change.toFixed(1)}% WoW)`;
  const title = `${data.city.name}, ${data.city.state} | Burger Price Index`;
  const description = `Burger Price Index for ${data.city.name}: ${
    bpi ? `$${bpi.toFixed(2)}${changeText}` : "collecting data"
  }. See restaurant prices, trends, and national comparison.`;
  const ogImage = `/api/og?city=${data.city.slug}`;
  const canonical = `${getSiteBaseUrl()}/cities/${data.city.slug}`;

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
          alt: `${data.city.name} Burger Price Index`,
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

export async function generateStaticParams() {
  const slugs = await getAllCitySlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function CityPage({ params }: CityPageProps) {
  const { slug } = await params;

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    notFound();
  }

  const cityData = await getCityBySlug(slug);
  if (!cityData) {
    notFound();
  }

  // Get all cities for national average calculation
  const allCities = await getAllCities();
  const nationalAvg = calculateNationalAverage(allCities);
  const rank = calculateRank(allCities, cityData.city.slug);
  const peerCities = findPeerCities(allCities, cityData.city.slug, 2);
  const webpageJsonLd = buildCityPageJsonLd(cityData);

  const snap = cityData.currentSnapshot;
  const faqItems = buildCityFaqItems({
    name: cityData.city.name,
    state: cityData.city.state,
    slug: cityData.city.slug,
    bpi: snap?.bpi_score ?? null,
    changePct: snap?.change_pct ?? null,
    weekOf: snap?.week_of ?? null,
    rank,
    totalCities: allCities.length,
    nationalAvg,
    cheapestRestaurant: snap?.cheapest_restaurant ?? null,
    cheapestPrice: snap?.cheapest_price ?? null,
    mostExpensiveRestaurant: snap?.most_expensive_restaurant ?? null,
    mostExpensivePrice: snap?.most_expensive_price ?? null,
    sampleSize: snap?.sample_size ?? null,
    peerCities,
  });
  const faqJsonLd = buildFaqPageJsonLd(faqItems);

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Header cities={allCities} />
      <main>
        <CityProfile
          data={cityData}
          nationalAvg={nationalAvg}
          rank={rank}
          totalCities={allCities.length}
          peerCities={peerCities}
        />

        {/* FAQ — mirrors FAQPage JSON-LD */}
        <section className="max-w-7xl mx-auto px-6 pb-14">
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard mb-6">
            {cityData.city.name} FAQ
          </h2>
          <div className="space-y-4">
            {faqItems.map((item) => (
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
            Compare markets on{" "}
            <Link
              href="/cities"
              className="text-ketchup dark:text-mustard hover:underline"
            >
              All Cities
            </Link>{" "}
            or the{" "}
            <Link
              href="/rankings"
              className="text-ketchup dark:text-mustard hover:underline"
            >
              weekly rankings
            </Link>
            . Methodology on{" "}
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


function findPeerCities(
  cities: Awaited<ReturnType<typeof getAllCities>>,
  slug: string,
  limit = 2,
): PeerCity[] {
  const currentBpi = cities.find((c) => c.city.slug === slug)?.currentSnapshot
    ?.bpi_score;
  if (currentBpi == null) return [];

  return cities
    .filter(
      (c) =>
        c.city.slug !== slug &&
        c.currentSnapshot?.bpi_score != null,
    )
    .sort(
      (a, b) =>
        Math.abs((a.currentSnapshot?.bpi_score ?? 0) - currentBpi) -
        Math.abs((b.currentSnapshot?.bpi_score ?? 0) - currentBpi),
    )
    .slice(0, limit)
    .map((c) => ({
      name: c.city.name,
      state: c.city.state,
      slug: c.city.slug,
      bpi: c.currentSnapshot!.bpi_score,
    }));
}

function calculateNationalAverage(cities: Awaited<ReturnType<typeof getAllCities>>): number | null {
  const scores = cities
    .map((c) => c.currentSnapshot?.bpi_score)
    .filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
}

function calculateRank(cities: Awaited<ReturnType<typeof getAllCities>>, slug: string): number {
  const ranked = cities
    .filter((c) => c.currentSnapshot)
    .sort((a, b) => (b.currentSnapshot?.bpi_score ?? 0) - (a.currentSnapshot?.bpi_score ?? 0));
  return ranked.findIndex((c) => c.city.slug === slug) + 1;
}
