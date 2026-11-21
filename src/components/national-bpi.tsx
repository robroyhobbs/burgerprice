"use client";

import Link from "next/link";
import { Fragment } from "react";
import type { NationalBpiPoint } from "@/lib/types";
import {
  recordPrintTokens,
  type RecordPrintToken,
} from "@/lib/city-readout";
import { Sparkline } from "./sparkline";
import { ShareStrip } from "./share-strip";
import { buildNationalCaption, nationalShareUrl } from "@/lib/share";

interface RecordWatchCity {
  slug: string;
  name: string;
  bpi: number;
  sinceLabel: string;
}

interface NationalBpiProps {
  history: NationalBpiPoint[];
  /** Lowest-BPI city name for share caption (optional). */
  cheapestCity?: string | null;
  /** Highest-BPI city name for share caption (optional). */
  mostExpensiveCity?: string | null;
  /** Biggest climber/slide vs the prior print. Omitted when null. */
  rankLine?: string | null;
  /** Record highs on the week this card prints. Empty omits the line. */
  recordHighs?: readonly RecordWatchCity[];
  /** Record lows on the week this card prints. Empty omits the line. */
  recordLows?: readonly RecordWatchCity[];
}

export function NationalBpi({
  history,
  cheapestCity = null,
  mostExpensiveCity = null,
  rankLine = null,
  recordHighs = [],
  recordLows = [],
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
    rankLine,
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

        <RecordWatch highs={recordHighs} lows={recordLows} />

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

function RecordWatch({
  highs,
  lows,
}: {
  highs: readonly RecordWatchCity[];
  lows: readonly RecordWatchCity[];
}) {
  const high = recordPrintTokens("high", highs);
  const low = recordPrintTokens("low", lows);
  if (!high && !low) return null;

  return (
    <div
      className="mt-5 pt-4 border-t border-gray-100 dark:border-grill-lighter"
      aria-label="Record watch"
    >
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
        Record watch
      </p>
      <RecordPrintLine tokens={high} />
      <RecordPrintLine tokens={low} />
    </div>
  );
}

function RecordPrintLine({ tokens }: { tokens: RecordPrintToken[] | null }) {
  if (!tokens) return null;
  return (
    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-1">
      {tokens.map((token, i) =>
        token.type === "city" ? (
          <Link
            key={token.slug}
            href={`/cities/${token.slug}`}
            className="font-medium text-gray-900 dark:text-white hover:text-ketchup dark:hover:text-mustard"
          >
            {token.name}
          </Link>
        ) : (
          <Fragment key={`${token.type}-${i}`}>{token.text}</Fragment>
        ),
      )}
    </p>
  );
}
