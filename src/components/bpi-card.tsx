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
      <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-6 flex-1">
        <h2 className="font-headline text-xl text-gray-400">
          {city.name}, {city.state}
        </h2>
        <p className="text-gray-400 mt-4">Awaiting data...</p>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white dark:bg-grill-light rounded-2xl p-6 flex-1 transition-all ${
        isWinner
          ? "border-2 border-mustard shadow-xl shadow-mustard/5 dark:shadow-mustard/10"
          : "border border-gray-200 dark:border-grill-lighter shadow-sm"
      }`}
    >
      {/* Winner badge */}
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="bg-gradient-to-r from-mustard to-mustard-light text-grill text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-md whitespace-nowrap">
            Higher BPI
          </div>
        </div>
      )}

      {/* City label */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
            {city.name}
          </h2>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {city.state}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-400 bpi-number block">
            {formatDate(currentSnapshot.week_of)}
          </span>
          <span className="text-[10px] text-gray-300 dark:text-gray-600 bpi-number">
            {currentSnapshot.sample_size} restaurants
          </span>
        </div>
      </div>

      {/* BPI Score */}
      <div className="text-center py-4">
        <div className="bpi-number text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-none">
          ${currentSnapshot.bpi_score.toFixed(2)}
        </div>
        <div className="mt-3">
          <TrendArrow change={currentSnapshot.change_pct} size="lg" />
        </div>
      </div>

      {/* Price range bar */}
      <div className="mt-4 mb-2">
        <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-wider mb-2">
          <span>Price Range</span>
        </div>
        <div className="relative h-2 bg-gray-100 dark:bg-grill rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-lettuce to-mustard to-negative rounded-full"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Cheapest / Most Expensive */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 rounded-xl bg-lettuce/5 dark:bg-lettuce/10 border border-lettuce/10">
          <div className="text-[9px] uppercase tracking-widest text-lettuce dark:text-lettuce-light font-medium mb-1">
            Cheapest
          </div>
          <div className="bpi-number text-xl font-bold text-lettuce dark:text-lettuce-light">
            ${currentSnapshot.cheapest_price.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-400 truncate mt-0.5" title={currentSnapshot.cheapest_restaurant}>
            {currentSnapshot.cheapest_restaurant}
          </div>
        </div>
        <div className="text-center p-3 rounded-xl bg-negative/5 dark:bg-negative/10 border border-negative/10">
          <div className="text-[9px] uppercase tracking-widest text-negative dark:text-red-400 font-medium mb-1">
            Priciest
          </div>
          <div className="bpi-number text-xl font-bold text-negative dark:text-red-400">
            ${currentSnapshot.most_expensive_price.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-400 truncate mt-0.5" title={currentSnapshot.most_expensive_restaurant}>
            {currentSnapshot.most_expensive_restaurant}
          </div>
        </div>
      </div>

      {/* Spotlight */}
      <BurgerSpotlight spotlight={spotlight} />
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
