"use client";

import Link from "next/link";
import { TickerTape } from "./ui/ticker-tape";
import { useTheme } from "./theme-provider";
import type { CityDashboardData } from "@/lib/types";

interface HeaderProps {
  cities: CityDashboardData[];
}

export function Header({ cities }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const latestWeek = cities[0]?.currentSnapshot?.week_of;
  const weekLabel = latestWeek
    ? `Week of ${new Date(latestWeek + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "";

  const tickerItems = cities.flatMap((c) => [
    {
      label: `${c.city.name} BPI`,
      value: c.currentSnapshot
        ? `$${c.currentSnapshot.bpi_score.toFixed(2)}`
        : "—",
      change: c.currentSnapshot?.change_pct ?? null,
    },
    {
      label: `${c.city.name} Low`,
      value: c.currentSnapshot
        ? `$${c.currentSnapshot.cheapest_price.toFixed(2)}`
        : "—",
      change: null,
    },
    {
      label: `${c.city.name} High`,
      value: c.currentSnapshot
        ? `$${c.currentSnapshot.most_expensive_price.toFixed(2)}`
        : "—",
      change: null,
    },
  ]);

  return (
    <header className="sticky top-0 z-50">
      <TickerTape items={tickerItems} />
      <div className="bg-paper/90 dark:bg-grill/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-grill-lighter/60">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-ketchup to-ketchup-light dark:from-mustard dark:to-mustard-light rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-ketchup/20 dark:shadow-mustard/20">
              🍔
            </div>
            <div>
              <h1 className="font-headline text-2xl md:text-3xl text-ketchup dark:text-mustard leading-none">
                BURGER PRICE INDEX
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 tracking-wide">
                Est. 2026 &middot; {cities.length} US Cities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-4">
              <Link
                href="/cities"
                className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-ketchup dark:hover:text-mustard transition-colors"
              >
                All Cities
              </Link>
              <Link
                href="/newsletter"
                className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-ketchup dark:hover:text-mustard transition-colors"
              >
                Newsletter
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-ketchup dark:hover:text-mustard transition-colors"
              >
                About
              </Link>
            </nav>
            {weekLabel && (
              <span className="hidden md:inline text-xs text-gray-400 bpi-number border-l border-gray-200 dark:border-grill-lighter pl-4">
                {weekLabel}
              </span>
            )}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl border border-gray-200 dark:border-grill-lighter hover:bg-gray-100 dark:hover:bg-grill-light transition-all flex items-center justify-center text-base"
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
