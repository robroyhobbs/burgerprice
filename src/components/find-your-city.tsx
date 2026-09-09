"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { City } from "@/lib/types";
import { NearMeButton, type NearMeResult } from "./near-me";

interface FindYourCityProps {
  cities: City[];
}

export function FindYourCity({ cities }: FindYourCityProps) {
  const [search, setSearch] = useState("");
  const [nearest, setNearest] = useState<NearMeResult | null>(null);
  const router = useRouter();

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return cities
      .filter((c) =>
        `${c.name} ${c.state}`.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [cities, search]);

  function handleFound(result: NearMeResult) {
    setNearest(result);
    // Brief beat so the chip is readable, then navigate
    window.setTimeout(() => {
      router.push(`/cities/${result.slug}`);
    }, 1200);
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
          📍
        </div>
        <div>
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
            Find Your City
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Closest tracked market. One tap. No app required.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter p-8 md:p-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <NearMeButton cities={cities} onFound={handleFound} />

          {nearest && (
            <Link
              href={`/cities/${nearest.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-ketchup/10 dark:bg-mustard/10 text-sm font-medium text-ketchup dark:text-mustard hover:opacity-90 transition-opacity"
            >
              Closest: {nearest.name} · {nearest.distanceMiles} mi
              <span aria-hidden>→</span>
            </Link>
          )}

          <div className="w-full max-w-md">
            <input
              type="text"
              placeholder="Or search a city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-grill-lighter bg-white dark:bg-grill text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ketchup/30 dark:focus:ring-mustard/30 text-sm"
            />
            {matches.length > 0 && (
              <ul className="mt-2 text-left rounded-2xl border border-gray-100 dark:border-grill-lighter overflow-hidden bg-white dark:bg-grill">
                {matches.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/cities/${c.slug}`}
                      className="block px-5 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-grill-light transition-colors border-b border-gray-50 dark:border-grill-lighter/50 last:border-b-0"
                    >
                      {c.name}
                      <span className="text-gray-400 ml-1">{c.state}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/cities"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-ketchup dark:hover:text-mustard transition-colors"
          >
            Browse all cities →
          </Link>
        </div>
      </div>
    </section>
  );
}
