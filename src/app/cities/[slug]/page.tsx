import { notFound } from "next/navigation";
import { getCityBySlug, getAllCities, getAllCitySlugs } from "@/lib/data";
import { CityProfile } from "@/components/city-profile";
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
  return {
    title: `${data.city.name}, ${data.city.state} | Burger Price Index`,
    description: `Burger Price Index for ${data.city.name}: ${bpi ? `$${bpi.toFixed(2)}` : "collecting data"}. See restaurant prices, trends, and national comparison.`,
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

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
      <Header cities={[cityData]} />
      <main>
        <CityProfile data={cityData} nationalAvg={nationalAvg} rank={rank} totalCities={allCities.length} />
      </main>
      <Footer />
    </div>
  );
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
