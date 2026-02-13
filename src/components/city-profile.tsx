"use client";

import type { CityDashboardData, RawPrice } from "@/lib/types";
import { TrendChart } from "./trend-chart";
import Link from "next/link";

interface CityProfileProps {
  data: CityDashboardData;
  nationalAvg: number | null;
  rank: number;
  totalCities: number;
}

export function CityProfile({ data, nationalAvg, rank, totalCities }: CityProfileProps) {
  const { city, currentSnapshot } = data;
  const bpi = currentSnapshot?.bpi_score ?? null;
  const change = currentSnapshot?.change_pct ?? null;
  const rawPrices = (currentSnapshot?.raw_prices ?? []) as RawPrice[];

  // Sort prices by category then price
  const sortedPrices = [...rawPrices].sort((a, b) => {
    const catOrder = { fast_food: 0, casual: 1, premium: 2 };
    const catDiff = (catOrder[a.category] ?? 1) - (catOrder[b.category] ?? 1);
    if (catDiff !== 0) return catDiff;
    return a.price - b.price;
  });

  const diffFromNational =
    bpi !== null && nationalAvg !== null
      ? Math.round(((bpi - nationalAvg) / nationalAvg) * 1000) / 10
      : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link
          href="/cities"
          className="text-xs text-gray-400 hover:text-ketchup dark:hover:text-mustard transition-colors"
        >
          &larr; All Cities
        </Link>
      </div>

      {/* Hero */}
      <div className="mb-12">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <h1 className="font-headline text-4xl md:text-6xl text-gray-900 dark:text-white">
            {city.name}
          </h1>
          <span className="text-xl text-gray-400 dark:text-gray-500 mb-1">
            {city.state}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {bpi !== null ? (
            <span className="bpi-number text-5xl md:text-7xl font-bold text-ketchup dark:text-mustard">
              ${bpi.toFixed(2)}
            </span>
          ) : (
            <span className="text-2xl text-gray-400">Collecting data...</span>
          )}

          <div className="flex flex-col gap-1">
            {change !== null && change !== 0 && (
              <span
                className={`bpi-number text-lg font-bold ${
                  change > 0
                    ? "text-negative dark:text-red-400"
                    : "text-lettuce dark:text-lettuce-light"
                }`}
              >
                {change > 0 ? "+" : ""}
                {change.toFixed(1)}% this week
              </span>
            )}
            {rank > 0 && (
              <span className="text-sm text-gray-400">
                #{rank} of {totalCities} cities
              </span>
            )}
          </div>
        </div>
      </div>

      {/* National Average Comparison */}
      {diffFromNational !== null && nationalAvg !== null && (
        <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg">🇺🇸</span>
            <h2 className="font-headline text-lg text-gray-900 dark:text-white">
              vs National Average
            </h2>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="bpi-number text-2xl font-bold text-gray-900 dark:text-white">
              ${nationalAvg.toFixed(2)}
            </span>
            <span className="text-gray-400">national avg</span>
            <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
            <span
              className={`bpi-number text-lg font-bold ${
                diffFromNational > 0
                  ? "text-negative dark:text-red-400"
                  : diffFromNational < 0
                    ? "text-lettuce dark:text-lettuce-light"
                    : "text-gray-400"
              }`}
            >
              {city.name} is {Math.abs(diffFromNational)}%{" "}
              {diffFromNational > 0 ? "above" : diffFromNational < 0 ? "below" : "at"} average
            </span>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <TrendChart cities={[data]} />

      {/* Restaurant Price Table */}
      {sortedPrices.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
              🍔
            </div>
            <div>
              <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
                Restaurant Prices
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {sortedPrices.length} restaurants sampled this week
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_5rem_6rem] gap-2 px-6 py-3 border-b border-gray-100 dark:border-grill-lighter text-[10px] uppercase tracking-widest text-gray-400 font-medium">
              <span>Restaurant</span>
              <span>Burger</span>
              <span className="text-right">Price</span>
              <span className="text-right">Type</span>
            </div>
            {sortedPrices.map((p, i) => (
              <div
                key={`${p.restaurant}-${i}`}
                className="grid grid-cols-[1fr_1fr_5rem_6rem] gap-2 px-6 py-3 border-b border-gray-50 dark:border-grill-lighter/50 last:border-b-0 items-center"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {p.restaurant}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {p.burger}
                </span>
                <span className="bpi-number text-sm font-bold text-right text-gray-900 dark:text-white">
                  ${p.price.toFixed(2)}
                </span>
                <span className="text-right">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      p.category === "fast_food"
                        ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400"
                        : p.category === "premium"
                          ? "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
                          : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                    }`}
                  >
                    {p.category === "fast_food" ? "Fast" : p.category === "premium" ? "Premium" : "Casual"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="mt-10 text-center py-12 bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter">
          <p className="text-gray-400 text-lg">No price data yet</p>
          <p className="text-gray-300 dark:text-gray-500 text-sm mt-2">
            Data will be collected on the next weekly update
          </p>
        </div>
      )}
    </div>
  );
}
