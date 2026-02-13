import type { SpreadEntry } from "@/lib/types";

interface TheSpreadProps {
  cheapest: SpreadEntry[];
  mostExpensive: SpreadEntry[];
}

export function TheSpread({ cheapest, mostExpensive }: TheSpreadProps) {
  if (cheapest.length === 0 && mostExpensive.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
          📏
        </div>
        <div>
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
            The Spread
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Top 3 cheapest vs. most expensive burgers this week
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cheapest */}
        <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 dark:border-grill-lighter">
            <span className="text-[10px] uppercase tracking-widest text-lettuce dark:text-lettuce-light font-bold">
              Best Value
            </span>
          </div>
          {cheapest.map((entry, i) => (
            <div
              key={`cheap-${entry.city}-${entry.restaurant}`}
              className="px-6 py-4 border-b border-gray-50 dark:border-grill-lighter/50 last:border-b-0 flex items-center gap-4"
            >
              <span className="bpi-number text-2xl font-bold text-lettuce dark:text-lettuce-light w-8 text-center">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {entry.restaurant}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {entry.city}, {entry.state}
                </p>
              </div>
              <span className="bpi-number text-lg font-bold text-lettuce dark:text-lettuce-light">
                ${entry.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Most Expensive */}
        <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 dark:border-grill-lighter">
            <span className="text-[10px] uppercase tracking-widest text-negative dark:text-red-400 font-bold">
              Premium Cut
            </span>
          </div>
          {mostExpensive.map((entry, i) => (
            <div
              key={`exp-${entry.city}-${entry.restaurant}`}
              className="px-6 py-4 border-b border-gray-50 dark:border-grill-lighter/50 last:border-b-0 flex items-center gap-4"
            >
              <span className="bpi-number text-2xl font-bold text-negative dark:text-red-400 w-8 text-center">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {entry.restaurant}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {entry.city}, {entry.state}
                </p>
              </div>
              <span className="bpi-number text-lg font-bold text-negative dark:text-red-400">
                ${entry.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
