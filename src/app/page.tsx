import { getDashboardData } from "@/lib/data";
import { Header } from "@/components/header";
import { CityShowdown } from "@/components/city-showdown";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

export default async function Home() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
      <Header cities={data.cities} />
      <main>
        <CityShowdown cities={data.cities} />
      </main>
    </div>
  );
}
