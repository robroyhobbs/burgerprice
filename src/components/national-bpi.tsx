"use client";

import type { NationalBpiPoint } from "@/lib/types";
import { Sparkline } from "./sparkline";
import { ShareStrip } from "./share-strip";
import { buildNationalCaption, nationalShareUrl } from "@/lib/share";

interface NationalBpiProps {
  history: NationalBpiPoint[];
  /** Lowest-BPI city name for share caption (optional). */
  cheapestCity?: string | null;
  /** Highest-BPI city name for share caption (optional). */
  mostExpensiveCity?: string | null;
}

export function NationalBpi({
  history,
  cheapestCity = null,
  mostExpensiveCity = null,
}: NationalBpiProps) {
  if (history.length === 0) return null;

  const current = history[history.length - 1];
  const previous = history.length >= 2 ? history[history.length - 2] : null;

  const change =
    previous && previous.avg_bpi > 0
      ? ((current.avg_bpi - previous.avg_bpi) / previous.avg_bpi) * 100
      : null;

  const isUp = change !== null && change > 0;
  const isDown = change !== null && change < 0;

  const shareUrl = nationalShareUrl();
  const caption = buildNationalCaption({
    weekOf: current.week_of,
    avgBpi: current.avg_bpi,
    changePct: change,
    cityCount: current.city_count,
    cheapestCity,
    mostExpensiveCity,
  });

  return (
    <section className="max-w-7xl mx-auto px-6 pt-8 pb-2">
      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: label + value */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">
                National Burger Price Index
              </p>
              <div className="flex items-baseline gap-3">
                <span className="bpi-number text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  ${current.avg_bpi.toFixed(2)}
                </span>
                {change !== null && (
                  <span
                    className={`bpi-number text-sm font-bold ${
                      isUp
                        ? "text-negative dark:text-red-400"
                        : isDown
                          ? "text-lettuce dark:text-lettuce-light"
                          : "text-gray-400"
                    }`}
                  >
                    {isUp ? "▲" : isDown ? "▼" : "—"}{" "}
                    {Math.abs(change).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Avg across {current.city_count} cities &middot;{" "}
                {new Date(current.week_of + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Right: sparkline */}
          <div className="flex-shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2 text-right">
              {history.length}-Week Trend
            </p>
            <Sparkline data={history} width={280} height={60} />
          </div>
        </div>

        <ShareStrip
          className="!mt-6"
          shareUrl={shareUrl}
          caption={caption}
          label="Share the national print"
        />
      </div>
    </section>
  );
}
