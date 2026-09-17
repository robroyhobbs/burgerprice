import { getAllCities } from "@/lib/data";
import { CitiesIndex } from "@/components/cities-index";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getSiteBaseUrl } from "@/lib/json-ld";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const canonical = `${getSiteBaseUrl()}/cities`;

export const metadata: Metadata = {
  title: "All Cities | Burger Price Index",
  description:
    "Compare burger prices across US cities. Find the most and least expensive cities for burgers — weekly BPI rankings, near-me discovery, and city showdowns.",
  alternates: { canonical },
  openGraph: {
    title: "All Cities | Burger Price Index",
    description:
      "Ranked BPI across US cities. Click through for restaurant prices, trends, and national comparison.",
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
    title: "All Cities | Burger Price Index",
    description:
      "Ranked BPI across US cities. Click through for restaurant prices, trends, and national comparison.",
    images: ["/api/og"],
  },
};

export default async function CitiesPage() {
  const cities = await getAllCities();

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
      <Header cities={cities} />
      <main>
        <CitiesIndex cities={cities} />
      </main>
      <Footer />
    </div>
  );
}