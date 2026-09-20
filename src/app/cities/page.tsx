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

export default async function CitiesPage() {
  const cities = await getAllCities();
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

  const withBpi = [...cities]
    .map((c) => ({
      name: c.city.name,
      bpi: c.currentSnapshot?.bpi_score ?? null,
    }))
    .filter((c): c is { name: string; bpi: number } => c.bpi !== null)
    .sort((a, b) => b.bpi - a.bpi);
  const premium = withBpi[0] ?? null;
  const value = withBpi.length > 0 ? withBpi[withBpi.length - 1] : null;

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
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
                premiumCity: premium?.name ?? null,
                premiumBpi: premium?.bpi ?? null,
                valueCity: value?.name ?? null,
                valueBpi: value?.bpi ?? null,
              })}
              label="Share the city grid"
            />
          </section>
        )}
        <CitiesIndex cities={cities} />
      </main>
      <Footer />
    </div>
  );
}