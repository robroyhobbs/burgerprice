"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CityDashboardData } from "@/lib/types";
import { vsNationalPct } from "@/lib/bpi";
import { NearMeButton, type NearMeResult } from "./near-me";
import { CityRequestForm } from "./city-request-form";

type SortMode = "pricey" | "cheap";

interface CitiesIndexProps {
  cities: CityDashboardData[];
  /** Current-week national BPI (avg across tracked cities). */
  nationalBpi?: number | null;
}

export function CitiesIndex({ cities, nationalBpi = null }: CitiesIndexProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("pricey");
  const [nearestInfo, setNearestInfo] = useState<NearMeResult | null>(null);
  const router = useRouter();

  // Rank # is always priciest-first among cities with a print.
  const rankedByPrice = useMemo(() => {
    return [...cities].sort((a, b) => {
      const aScore = a.currentSnapshot?.bpi_score ?? null;
      const bScore = b.currentSnapshot?.bpi_score ?? null;
      if (aScore === null && bScore === null) return 0;
      if (aScore === null) return 1;
      if (bScore === null) return -1;
      return bScore - aScore;
    });
  }, [cities]);

  const ranked = useMemo(() => {
    return [...cities]
      .sort((a, b) => {
        const aScore = a.currentSnapshot?.bpi_score ?? null;
        const bScore = b.currentSnapshot?.bpi_score ?? null;
        if (aScore === null && bScore === null) return 0;
        if (aScore === null) return 1;
        if (bScore === null) return -1;
        return sort === "cheap" ? aScore - bScore : bScore - aScore;
      })
      .filter((c) =>
        `${c.city.name} ${c.city.state}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
  }, [cities, sort, search]);

  function handleNearMeFound(result: NearMeResult) {
    setNearestInfo(result);
    window.setTimeout(() => {
      router.push(`/cities/${result.slug}`);
    }, 900);
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-14">
      <div className="text-center mb-12">
        <h1 className="font-headline text-3xl md:text-5xl text-gray-900 dark:text-white mb-3">
          All Cities
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto mb-6">
          Compare burger prices across {cities.length} US cities. Click any city for a full price breakdown.
          Prefer the table?{" "}
          <Link href="/rankings" className="text-ketchup dark:text-mustard hover:underline">
            See weekly rankings
          </Link>
          .
        </p>
        <NearMeButton
          cities={cities.map((c) => c.city)}
          onFound={handleNearMeFound}
        />
        {nearestInfo && (
          <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-ketchup/10 dark:bg-mustard/10 text-sm font-medium text-ketchup dark:text-mustard">
            Closest: {nearestInfo.name} · {nearestInfo.distanceMiles} mi
          </p>
        )}
      </div>

      {/* Search + sort */}
      <div className="max-w-md mx-auto mb-10 space-y-3">
        <input
          type="text"
          placeholder="Search cities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-grill-lighter bg-white dark:bg-grill-light text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ketchup/30 dark:focus:ring-mustard/30 text-sm"
        />
        <div
          className="flex items-center justify-center gap-1 p-1 rounded-2xl border border-gray-200 dark:border-grill-lighter bg-white dark:bg-grill-light"
          role="group"
          aria-label="Sort cities by BPI"
        >
          <button
            type="button"
            onClick={() => setSort("cheap")}
            aria-pressed={sort === "cheap"}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              sort === "cheap"
                ? "bg-ketchup/10 dark:bg-mustard/10 text-ketchup dark:text-mustard"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Cheapest first
          </button>
          <button
            type="button"
            onClick={() => setSort("pricey")}
            aria-pressed={sort === "pricey"}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              sort === "pricey"
                ? "bg-ketchup/10 dark:bg-mustard/10 text-ketchup dark:text-mustard"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Priciest first
          </button>
        </div>
      </div>

      {/* Grid */}
      {ranked.length === 0 ? (
        <p className="text-center text-gray-400 py-12">No cities found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ranked.map((item) => {
            const bpi = item.currentSnapshot?.bpi_score ?? null;
            const change = item.currentSnapshot?.change_pct ?? null;
            const globalRank =
              rankedByPrice
                .filter((c) => c.currentSnapshot)
                .findIndex((c) => c.city.slug === item.city.slug) + 1;
            const vsNational = vsNationalPct(bpi, nationalBpi);

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
                {vsNational !== null && nationalBpi !== null && (
                  <p className="mt-3 pt-3 border-t border-gray-100 dark:border-grill-lighter text-xs text-gray-500 dark:text-gray-400">
                    {Math.abs(vsNational) < 0.05 ? (
                      <>In line with national ${nationalBpi.toFixed(2)}</>
                    ) : (
                      <>
                        <span
                          className={`bpi-number font-bold ${
                            vsNational > 0
                              ? "text-negative dark:text-red-400"
                              : "text-lettuce dark:text-lettuce-light"
                          }`}
                        >
                          {Math.abs(vsNational).toFixed(1)}%{" "}
                          {vsNational > 0 ? "above" : "below"}
                        </span>{" "}
                        national ${nationalBpi.toFixed(2)}
                      </>
                    )}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Request a City */}
      <div className="mt-16">
        <CityRequestForm />
      </div>
    </section>
  );
}
