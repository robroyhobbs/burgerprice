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
    <section className="max-w-6xl mx-auto px-4 pt-10 pb-4">
      {/* Section header */}
      <div className="text-center mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-2">
          Weekly Showdown
        </p>
        <h2 className="font-headline text-2xl md:text-3xl text-gray-900 dark:text-white">
          {city1.city.name} <span className="text-gray-300 dark:text-gray-600 mx-2">vs</span> {city2.city.name}
        </h2>
      </div>

      {/* Cards */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        <BpiCard data={city1} isWinner={!isTie && bpi1 > bpi2} />

        {/* VS pill */}
        <div className="flex items-center justify-center lg:flex-col shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-ketchup to-ketchup-light dark:from-mustard dark:to-mustard-light flex items-center justify-center text-white font-headline text-lg shadow-lg shadow-ketchup/20 dark:shadow-mustard/20">
            VS
          </div>
        </div>

        <BpiCard data={city2} isWinner={!isTie && bpi2 > bpi1} />
      </div>
    </section>
  );
}
