"use client";

import { TickerTape } from "./ui/ticker-tape";
import { useTheme } from "./theme-provider";
import type { CityDashboardData } from "@/lib/types";

interface HeaderProps {
  cities: CityDashboardData[];
}

export function Header({ cities }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const tickerItems = cities.map((c) => ({
    label: `${c.city.name} BPI`,
    value: c.currentSnapshot ? `$${c.currentSnapshot.bpi_score.toFixed(2)}` : "—",
    change: c.currentSnapshot?.change_pct ?? null,
  }));

  // Add some extra flavor items
  tickerItems.push(
    { label: "Avg Burger", value: cities[0]?.currentSnapshot ? `$${cities[0].currentSnapshot.avg_price.toFixed(2)}` : "—", change: null },
    { label: "Samples", value: cities.reduce((s, c) => s + (c.currentSnapshot?.sample_size ?? 0), 0).toString(), change: null },
  );

  return (
    <header>
      <TickerTape items={tickerItems} />
      <div className="bg-paper dark:bg-grill border-b border-gray-200 dark:border-grill-lighter">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label="burger">
              🍔
            </span>
            <div>
              <h1 className="font-headline text-2xl md:text-3xl text-ketchup dark:text-mustard leading-tight">
                BURGER PRICE INDEX
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400 mt-0.5">
                The Financial Index for Burger Lovers
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-grill-light transition-colors text-lg"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </div>
    </header>
  );
}
