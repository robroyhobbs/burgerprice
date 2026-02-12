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
    <section className="max-w-7xl mx-auto px-6 pt-14 pb-6">
      {/* Section header */}
      <div className="text-center mb-12">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-3 font-medium">
          Weekly Showdown
        </p>
        <h2 className="font-headline text-3xl md:text-5xl text-gray-900 dark:text-white">
          {city1.city.name} <span className="text-gray-300 dark:text-gray-600 mx-3">vs</span> {city2.city.name}
        </h2>
      </div>

      {/* Cards */}
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        <BpiCard data={city1} isWinner={!isTie && bpi1 > bpi2} />

        {/* VS pill */}
        <div className="flex items-center justify-center lg:flex-col shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ketchup to-ketchup-light dark:from-mustard dark:to-mustard-light flex items-center justify-center text-white font-headline text-xl shadow-xl shadow-ketchup/25 dark:shadow-mustard/25">
            VS
          </div>
        </div>

        <BpiCard data={city2} isWinner={!isTie && bpi2 > bpi1} />
      </div>
    </section>
  );
}
