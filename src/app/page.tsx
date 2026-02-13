import { getDashboardData } from "@/lib/data";
import { Header } from "@/components/header";
import { CityShowdown } from "@/components/city-showdown";
import { Leaderboard } from "@/components/leaderboard";
import { CandlestickChart } from "@/components/candlestick-chart";
import { MarketReport } from "@/components/market-report";
import { IndustryNews } from "@/components/industry-news";
import { NewsletterForm } from "@/components/newsletter-form";
import { Footer } from "@/components/footer";
import { getShowdownIndices } from "@/lib/showdown";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function Home() {
  const data = await getDashboardData();

  // Pick 2 showdown cities based on current week (deterministic rotation)
  const [idx1, idx2] = getShowdownIndices(data.weekOf, data.cities.length);
  const showdownCities = [data.cities[idx1], data.cities[idx2]].filter(Boolean);

  // For the trend chart, show the showdown pair
  const trendCities =
    showdownCities.length >= 2 ? showdownCities : data.cities.slice(0, 2);

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
      <Header cities={showdownCities} />
      <main className="space-y-6 md:space-y-10">
        <CityShowdown cities={showdownCities} />
        <Leaderboard cities={data.cities} />
        <CandlestickChart cities={trendCities} />
        <MarketReport report={data.latestReport} />
        <IndustryNews news={data.news} />
        <NewsletterForm />
      </main>
      <Footer />
    </div>
  );
}
