import type { CityDashboardData } from "@/lib/types";
import { TrendArrow } from "./ui/trend-arrow";
import { BurgerSpotlight } from "./burger-spotlight";

interface BpiCardProps {
  data: CityDashboardData;
  isWinner: boolean;
}

export function BpiCard({ data, isWinner }: BpiCardProps) {
  const { city, currentSnapshot, spotlight } = data;

  if (!currentSnapshot) {
    return (
      <div className="bg-white dark:bg-grill-light rounded-xl border border-gray-200 dark:border-grill-lighter p-6 flex-1">
        <h2 className="font-headline text-xl text-gray-400">
          {city.name}, {city.state}
        </h2>
        <p className="text-gray-400 mt-4">No data available</p>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white dark:bg-grill-light rounded-xl border-2 p-6 flex-1 transition-all ${
        isWinner
          ? "border-mustard dark:border-mustard shadow-lg shadow-mustard/10"
          : "border-gray-200 dark:border-grill-lighter"
      }`}
    >
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-mustard text-grill text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
          Higher BPI
        </div>
      )}

      {/* City Name */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-xl text-ketchup dark:text-mustard">
          {city.name}, {city.state}
        </h2>
        <span className="text-xs text-gray-400 bpi-number">
          Week of {formatDate(currentSnapshot.week_of)}
        </span>
      </div>

      {/* BPI Score - The Hero Number */}
      <div className="text-center mb-4">
        <div className="bpi-number text-5xl md:text-6xl font-bold text-gray-900 dark:text-white">
          ${currentSnapshot.bpi_score.toFixed(2)}
        </div>
        <div className="mt-2">
          <TrendArrow change={currentSnapshot.change_pct} size="lg" />
        </div>
      </div>

      {/* Price Range */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-gray-50 dark:bg-grill rounded-lg p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Cheapest
          </div>
          <div className="bpi-number text-lg font-bold text-lettuce dark:text-lettuce-light">
            ${currentSnapshot.cheapest_price.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-400 truncate" title={currentSnapshot.cheapest_restaurant}>
            {currentSnapshot.cheapest_restaurant}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-grill rounded-lg p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Most Expensive
          </div>
          <div className="bpi-number text-lg font-bold text-negative dark:text-red-400">
            ${currentSnapshot.most_expensive_price.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-400 truncate" title={currentSnapshot.most_expensive_restaurant}>
            {currentSnapshot.most_expensive_restaurant}
          </div>
        </div>
      </div>

      {/* Sample Size */}
      <div className="text-center mt-3">
        <span className="text-[10px] text-gray-400">
          Based on {currentSnapshot.sample_size} restaurants surveyed
        </span>
      </div>

      {/* Burger of the Week */}
      <BurgerSpotlight spotlight={spotlight} />
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
