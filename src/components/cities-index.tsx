"use client";

import { useState } from "react";
import Link from "next/link";
import type { CityDashboardData } from "@/lib/types";

interface CitiesIndexProps {
  cities: CityDashboardData[];
}

export function CitiesIndex({ cities }: CitiesIndexProps) {
  const [search, setSearch] = useState("");

  // Sort by BPI descending, no-data cities last
  const ranked = [...cities]
    .sort((a, b) => {
      const aScore = a.currentSnapshot?.bpi_score ?? -1;
      const bScore = b.currentSnapshot?.bpi_score ?? -1;
      return bScore - aScore;
    })
    .filter((c) =>
      `${c.city.name} ${c.city.state}`.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <section className="max-w-7xl mx-auto px-6 py-14">
      <div className="text-center mb-12">
        <h1 className="font-headline text-3xl md:text-5xl text-gray-900 dark:text-white mb-3">
          All Cities
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          Compare burger prices across {cities.length} US cities. Click any city for a full price breakdown.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-10">
        <input
          type="text"
          placeholder="Search cities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-grill-lighter bg-white dark:bg-grill-light text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ketchup/30 dark:focus:ring-mustard/30 text-sm"
        />
      </div>

      {/* Grid */}
      {ranked.length === 0 ? (
        <p className="text-center text-gray-400 py-12">No cities found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ranked.map((item, index) => {
            const bpi = item.currentSnapshot?.bpi_score ?? null;
            const change = item.currentSnapshot?.change_pct ?? null;
            const globalRank = cities
              .filter((c) => c.currentSnapshot)
              .sort((a, b) => (b.currentSnapshot?.bpi_score ?? 0) - (a.currentSnapshot?.bpi_score ?? 0))
              .findIndex((c) => c.city.slug === item.city.slug) + 1;

            return (
              <Link
                key={item.city.slug}
                href={`/cities/${item.city.slug}`}
                className="group bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-6 hover:shadow-lg hover:border-ketchup/30 dark:hover:border-mustard/30 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-headline text-lg text-gray-900 dark:text-white group-hover:text-ketchup dark:group-hover:text-mustard transition-colors">
                      {item.city.name}
                    </h3>
                    <p className="text-xs text-gray-400">{item.city.state}</p>
                  </div>
                  {globalRank > 0 && (
                    <span className="bpi-number text-xs font-bold text-gray-300 dark:text-gray-600">
                      #{globalRank}
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <span className="bpi-number text-3xl font-bold text-gray-900 dark:text-white">
                    {bpi !== null ? `$${bpi.toFixed(2)}` : "—"}
                  </span>
                  {change !== null && change !== 0 ? (
                    <span
                      className={`bpi-number text-sm font-bold ${
                        change > 0
                          ? "text-negative dark:text-red-400"
                          : "text-lettuce dark:text-lettuce-light"
                      }`}
                    >
                      {change > 0 ? "+" : ""}
                      {change.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
