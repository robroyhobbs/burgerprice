import {
  getDashboardData,
  getNationalBpiHistory,
  getSpreadData,
} from "@/lib/data";
import { Header } from "@/components/header";
import { NationalBpi } from "@/components/national-bpi";
import { CityShowdown } from "@/components/city-showdown";
import { Leaderboard } from "@/components/leaderboard";
import { CandlestickChart } from "@/components/candlestick-chart";
import { MarketReport } from "@/components/market-report";
import { IndustryNews } from "@/components/industry-news";
import { NewsletterForm } from "@/components/newsletter-form";
import { TheSpread } from "@/components/the-spread";
import { Footer } from "@/components/footer";
import { getShowdownIndices } from "@/lib/showdown";

export const revalidate = 3600;

export default async function Home() {
  const data = await getDashboardData();
  const nationalHistory = getNationalBpiHistory(data.cities);
  const spread = getSpreadData(data.cities);

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
        <NationalBpi history={nationalHistory} />
        <CityShowdown cities={showdownCities} />
        <Leaderboard cities={data.cities} />
        <CandlestickChart cities={trendCities} />
        <MarketReport report={data.latestReport} />
        <IndustryNews news={data.news} />
        <TheSpread
          cheapest={spread.cheapest}
          mostExpensive={spread.mostExpensive}
        />
        <NewsletterForm />
      </main>
      <Footer />
    </div>
  );
}
