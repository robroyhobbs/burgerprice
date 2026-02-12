import { getDashboardData } from "@/lib/data";
import { Header } from "@/components/header";
import { CityShowdown } from "@/components/city-showdown";
import { TrendChart } from "@/components/trend-chart";
import { MarketReport } from "@/components/market-report";
import { IndustryNews } from "@/components/industry-news";
import { NewsletterForm } from "@/components/newsletter-form";
import { Footer } from "@/components/footer";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function Home() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
      <Header cities={data.cities} />
      <main className="space-y-6 md:space-y-10">
        <CityShowdown cities={data.cities} />
        <TrendChart cities={data.cities} />
        <MarketReport report={data.latestReport} />
        <IndustryNews news={data.news} />
        <NewsletterForm />
      </main>
      <Footer />
    </div>
  );
}
