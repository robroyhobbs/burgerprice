import type { CityDashboardData } from "@/lib/types";
import Link from "next/link";

interface LeaderboardProps {
  cities: CityDashboardData[];
}

export function Leaderboard({ cities }: LeaderboardProps) {
  // Sort cities by BPI score descending, cities without data go last
  const ranked = [...cities]
    .map((c) => ({
      ...c,
      bpi: c.currentSnapshot?.bpi_score ?? null,
      change: c.currentSnapshot?.change_pct ?? null,
    }))
    .sort((a, b) => {
      if (a.bpi === null && b.bpi === null) return 0;
      if (a.bpi === null) return 1;
      if (b.bpi === null) return -1;
      return b.bpi - a.bpi;
    });

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
          🏆
        </div>
        <div>
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
            National BPI Rankings
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {ranked.length} cities tracked &middot; Updated weekly
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[3rem_1fr_6rem_5rem] md:grid-cols-[3rem_1fr_7rem_6rem] gap-2 px-6 py-3 border-b border-gray-100 dark:border-grill-lighter text-[10px] uppercase tracking-widest text-gray-400 font-medium">
          <span>#</span>
          <span>City</span>
          <span className="text-right">BPI</span>
          <span className="text-right">Chg</span>
        </div>

        {/* Rows */}
        {ranked.map((item, index) => {
          const rank = index + 1;
          const isPositive = item.change !== null && item.change > 0;
          const isNegative = item.change !== null && item.change < 0;

          return (
            <Link
              key={item.city.slug}
              href={`/cities/${item.city.slug}`}
              className="grid grid-cols-[3rem_1fr_6rem_5rem] md:grid-cols-[3rem_1fr_7rem_6rem] gap-2 px-6 py-4 border-b border-gray-50 dark:border-grill-lighter/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-grill transition-colors items-center"
            >
              <span className="bpi-number text-sm font-bold text-gray-300 dark:text-gray-600">
                {rank}
              </span>
              <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {item.city.name}
                <span className="text-gray-400 dark:text-gray-500 ml-1">
                  {item.city.state}
                </span>
              </span>
              <span className="bpi-number text-sm font-bold text-right text-gray-900 dark:text-white">
                {item.bpi !== null ? `$${item.bpi.toFixed(2)}` : "—"}
              </span>
              <span
                className={`bpi-number text-xs font-bold text-right ${
                  isPositive
                    ? "text-negative dark:text-red-400"
                    : isNegative
                      ? "text-lettuce dark:text-lettuce-light"
                      : "text-gray-400"
                }`}
              >
                {item.change !== null && item.change !== 0
                  ? `${isPositive ? "+" : ""}${item.change.toFixed(1)}%`
                  : "—"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
