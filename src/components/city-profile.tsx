"use client";

import type { CityDashboardData, RawPrice } from "@/lib/types";
import { getRestaurantUrl } from "@/lib/restaurant-utils";
import { getMinimumWage } from "@/lib/wages";
import {
  buildCityRead,
  buildTapeStory,
  formatTapeWeek,
  sliceRecentTape,
} from "@/lib/city-readout";
import { TrendArrow } from "./ui/trend-arrow";
import { CandlestickChart } from "./candlestick-chart";
import { BurgerSpotlight } from "./burger-spotlight";
import Link from "next/link";
import { ShareStrip } from "./share-strip";
import { buildCityCaption, cityShareUrl } from "@/lib/share";

export interface PeerCity {
  name: string;
  state: string;
  slug: string;
  bpi: number;
}

interface CityProfileProps {
  data: CityDashboardData;
  nationalAvg: number | null;
  rank: number;
  totalCities: number;
  peerCities?: PeerCity[];
}

function findWebsite(name: string, prices: RawPrice[]): string | null {
  const match = prices.find((p) => p.restaurant === name && p.website);
  return match?.website ?? null;
}

export function CityProfile({
  data,
  nationalAvg,
  rank,
  totalCities,
  peerCities = [],
}: CityProfileProps) {
  const { city, currentSnapshot, spotlight } = data;
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

  const theRead = buildCityRead({
    name: city.name,
    bpi,
    changePct: change,
    rank,
    totalCities,
    nationalAvg,
    diffFromNational,
  });

  // Reuse the same ascending history the candlestick chart already charts.
  const tapePrints = sliceRecentTape(data.history, 5);
  const tapeStory = buildTapeStory(city.name, tapePrints);

  const wage = getMinimumWage(city.slug);
  const burgersPerHour =
    wage && bpi != null && bpi > 0
      ? Math.round((wage.min_wage / bpi) * 100) / 100
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

      <ShareStrip
        className="!mt-0 mb-8"
        shareUrl={cityShareUrl(city.slug)}
        caption={buildCityCaption({
          name: city.name,
          state: city.state,
          slug: city.slug,
          bpi,
          changePct: change,
          rank,
          totalCities,
          nationalAvg,
        })}
        label="Share this city"
      />

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
              {diffFromNational > 0
                ? "above"
                : diffFromNational < 0
                  ? "below"
                  : "at"}{" "}
              average
            </span>
          </div>
        </div>
      )}

      {/* THE READ */}
      {theRead && (
        <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-ketchup dark:text-mustard">
              The Read
            </span>
          </div>
          <p className="text-base md:text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
            {theRead}
          </p>
        </div>
      )}

      {/* ON THE TAPE — recent weeks WoW strip (same history as chart) */}
      {tapePrints.length >= 2 && (
        <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-6 mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-ketchup dark:text-mustard">
              On the Tape
            </span>
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
              Last {tapePrints.length} weeks
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {tapePrints.map((print, i) => {
              const isLatest = i === tapePrints.length - 1;
              return (
                <div
                  key={print.weekOf}
                  className={`flex-shrink-0 min-w-[6.5rem] rounded-xl border px-3 py-2.5 ${
                    isLatest
                      ? "border-ketchup/30 dark:border-mustard/30 bg-ketchup/5 dark:bg-mustard/5"
                      : "border-gray-100 dark:border-grill-lighter bg-gray-50/80 dark:bg-grill/40"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                    {formatTapeWeek(print.weekOf)}
                  </div>
                  <div
                    className={`bpi-number text-lg font-bold ${
                      isLatest
                        ? "text-ketchup dark:text-mustard"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    ${print.bpi.toFixed(2)}
                  </div>
                  <div className="mt-1">
                    {i === 0 && print.changePct == null ? (
                      <span className="text-[10px] text-gray-400">open</span>
                    ) : (
                      <TrendArrow change={print.changePct} size="sm" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {tapeStory && (
            <p className="mt-4 text-sm md:text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
              {tapeStory}
            </p>
          )}
        </div>
      )}

      {/* Value Trade / Premium Print (+ BOTW when present) */}
      {currentSnapshot && (
        <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-2xl bg-lettuce/5 dark:bg-lettuce/10 border border-lettuce/10">
              <div className="text-[10px] uppercase tracking-widest text-lettuce dark:text-lettuce-light font-medium mb-2">
                Value Trade
              </div>
              <div className="bpi-number text-2xl font-bold text-lettuce dark:text-lettuce-light">
                ${currentSnapshot.cheapest_price.toFixed(2)}
              </div>
              <div
                className="text-xs truncate mt-1"
                title={currentSnapshot.cheapest_restaurant}
              >
                <a
                  href={getRestaurantUrl(
                    currentSnapshot.cheapest_restaurant,
                    city.name,
                    city.state,
                    findWebsite(currentSnapshot.cheapest_restaurant, rawPrices),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-lettuce dark:hover:text-lettuce-light transition-colors underline decoration-dotted underline-offset-2"
                >
                  {currentSnapshot.cheapest_restaurant}
                </a>
              </div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-negative/5 dark:bg-negative/10 border border-negative/10">
              <div className="text-[10px] uppercase tracking-widest text-negative dark:text-red-400 font-medium mb-2">
                Premium Print
              </div>
              <div className="bpi-number text-2xl font-bold text-negative dark:text-red-400">
                ${currentSnapshot.most_expensive_price.toFixed(2)}
              </div>
              <div
                className="text-xs truncate mt-1"
                title={currentSnapshot.most_expensive_restaurant}
              >
                <a
                  href={getRestaurantUrl(
                    currentSnapshot.most_expensive_restaurant,
                    city.name,
                    city.state,
                    findWebsite(
                      currentSnapshot.most_expensive_restaurant,
                      rawPrices,
                    ),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-negative dark:hover:text-red-400 transition-colors underline decoration-dotted underline-offset-2"
                >
                  {currentSnapshot.most_expensive_restaurant}
                </a>
              </div>
            </div>
          </div>
          <BurgerSpotlight
            spotlight={spotlight}
            cityName={city.name}
            cityState={city.state}
            rawPrices={rawPrices}
          />
        </div>
      )}

      {/* Spotlight-only fallback (no snapshot extremes) */}
      {!currentSnapshot && spotlight && (
        <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-6 mb-8">
          <BurgerSpotlight
            spotlight={spotlight}
            cityName={city.name}
            cityState={city.state}
            rawPrices={rawPrices}
          />
        </div>
      )}

      {/* Local Purchasing Power */}
      {wage && burgersPerHour != null && (
        <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">💪</span>
            <div>
              <h2 className="font-headline text-lg text-gray-900 dark:text-white">
                Local Purchasing Power
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Min wage vs the local BPI print
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <span className="bpi-number text-3xl font-bold text-ketchup dark:text-mustard">
                {burgersPerHour.toFixed(1)}
              </span>
              <span className="text-sm text-gray-400 ml-2 uppercase tracking-wider">
                burgers/hr
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ${wage.min_wage.toFixed(2)}/hr {wage.source} min wage buys{" "}
              {burgersPerHour.toFixed(1)} of the ${bpi!.toFixed(2)} BPI basket.
              The market clears; your wallet may not.
            </div>
          </div>
        </div>
      )}

      {/* Peer cities (closest BPI) */}
      {peerCities.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">
              Peer Prints
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {peerCities.map((peer) => (
              <Link
                key={peer.slug}
                href={`/cities/${peer.slug}`}
                className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-5 hover:border-ketchup/30 dark:hover:border-mustard/30 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">
                      {peer.name}, {peer.state}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Closest BPI on the tape
                    </p>
                  </div>
                  <span className="bpi-number text-xl font-bold text-ketchup dark:text-mustard shrink-0">
                    ${peer.bpi.toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <CandlestickChart cities={[data]} />

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
                <a
                  href={getRestaurantUrl(
                    p.restaurant,
                    city.name,
                    city.state,
                    p.website,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-ketchup dark:hover:text-mustard transition-colors underline decoration-dotted underline-offset-2"
                >
                  {p.restaurant}
                </a>
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
                    {p.category === "fast_food"
                      ? "Fast"
                      : p.category === "premium"
                        ? "Premium"
                        : "Casual"}
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

      {/* Methodology footnote */}
      <p className="mt-10 text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-2xl">
        BPI is a weighted average of fast-food, casual, and premium burger
        prices sampled weekly. Not financial advice — just the tape.{" "}
        <Link
          href="/about"
          className="text-ketchup dark:text-mustard hover:underline"
        >
          Full methodology
        </Link>
        .
      </p>
    </div>
  );
}
