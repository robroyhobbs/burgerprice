"use client";

import { TickerTape } from "./ui/ticker-tape";
import { useTheme } from "./theme-provider";
import type { CityDashboardData } from "@/lib/types";

interface HeaderProps {
  cities: CityDashboardData[];
}

export function Header({ cities }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const tickerItems = cities.flatMap((c) => [
    {
      label: `${c.city.name} BPI`,
      value: c.currentSnapshot ? `$${c.currentSnapshot.bpi_score.toFixed(2)}` : "—",
      change: c.currentSnapshot?.change_pct ?? null,
    },
    {
      label: `${c.city.name} Low`,
      value: c.currentSnapshot ? `$${c.currentSnapshot.cheapest_price.toFixed(2)}` : "—",
      change: null,
    },
    {
      label: `${c.city.name} High`,
      value: c.currentSnapshot ? `$${c.currentSnapshot.most_expensive_price.toFixed(2)}` : "—",
      change: null,
    },
  ]);

  return (
    <header className="sticky top-0 z-50">
      <TickerTape items={tickerItems} />
      <div className="bg-paper/95 dark:bg-grill/95 backdrop-blur-md border-b border-gray-200 dark:border-grill-lighter">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ketchup dark:bg-mustard rounded-lg flex items-center justify-center text-xl shadow-sm">
              🍔
            </div>
            <div>
              <h1 className="font-headline text-xl md:text-2xl text-ketchup dark:text-mustard leading-none tracking-wide">
                BURGER PRICE INDEX
              </h1>
              <p className="text-[9px] uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 mt-1">
                Est. 2026 &middot; Boston &middot; Seattle
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-gray-400 bpi-number">
              Week of Feb 10
            </span>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg border border-gray-200 dark:border-grill-lighter hover:bg-gray-100 dark:hover:bg-grill-light transition-colors flex items-center justify-center text-sm"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
