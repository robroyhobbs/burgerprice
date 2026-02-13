import { getAllCities } from "@/lib/data";
import { CitiesIndex } from "@/components/cities-index";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All Cities | Burger Price Index",
  description: "Compare burger prices across US cities. Find the most and least expensive cities for burgers.",
};

export default async function CitiesPage() {
  const cities = await getAllCities();

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
      <Header cities={cities.slice(0, 2)} />
      <main>
        <CitiesIndex cities={cities} />
      </main>
      <Footer />
    </div>
  );
}
