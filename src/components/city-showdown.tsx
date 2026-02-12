import type { CityDashboardData } from "@/lib/types";
import { BpiCard } from "./bpi-card";

interface CityShowdownProps {
  cities: CityDashboardData[];
}

export function CityShowdown({ cities }: CityShowdownProps) {
  if (cities.length < 2) return null;

  const [city1, city2] = cities;
  const bpi1 = city1.currentSnapshot?.bpi_score ?? 0;
  const bpi2 = city2.currentSnapshot?.bpi_score ?? 0;
  const isTie = Math.abs(bpi1 - bpi2) < 0.01;

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      {/* VS Badge */}
      <div className="flex items-center justify-center mb-6">
        <div className="h-px flex-1 bg-gray-200 dark:bg-grill-lighter" />
        <span className="mx-4 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          City Showdown
        </span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-grill-lighter" />
      </div>

      {/* Cards */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        <BpiCard data={city1} isWinner={!isTie && bpi1 > bpi2} />

        {/* VS divider */}
        <div className="flex items-center justify-center md:flex-col">
          <div className="w-12 h-12 rounded-full bg-ketchup dark:bg-mustard flex items-center justify-center text-white font-headline text-lg shadow-lg">
            VS
          </div>
        </div>

        <BpiCard data={city2} isWinner={!isTie && bpi2 > bpi1} />
      </div>
    </section>
  );
}
