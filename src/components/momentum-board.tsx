import Link from "next/link";
import {
  formatMomentumGap,
  type MomentumBoardRow,
} from "@/lib/momentum-board";
import type { StreakDirection } from "@/lib/city-readout";

/**
 * Momentum board for /rankings.
 * Rows are already ranked (hottest gap versus the 4-week average first).
 * A city under four prints keeps its streak and leaves the average blank.
 */
export function MomentumBoard({
  rows,
}: {
  rows: readonly MomentumBoardRow[] | null;
}) {
  if (!rows || rows.length === 0) return null;

  return (
    <section
      id="momentum"
      className="max-w-7xl mx-auto px-6 py-8 scroll-mt-32"
      aria-labelledby="momentum-heading"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
          📈
        </div>
        <div>
          <h2
            id="momentum-heading"
            className="font-headline text-2xl text-ketchup dark:text-mustard leading-none"
          >
            Momentum Board
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Hottest gap versus the 4-week average leads. Under four prints,
            the streak stays and the average stays blank.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-grill-lighter text-[10px] uppercase tracking-widest text-gray-400 font-medium md:hidden">
          <span className="w-6">#</span>
          <span className="flex-1">City</span>
          <span className="text-right">Gap</span>
        </div>
        <div className="hidden md:grid md:grid-cols-[2.5rem_minmax(0,1.4fr)_5.25rem_5.75rem_5.25rem_minmax(11rem,1.2fr)] gap-3 px-6 py-3 border-b border-gray-100 dark:border-grill-lighter text-[10px] uppercase tracking-widest text-gray-400 font-medium">
          <span>#</span>
          <span>City</span>
          <span className="text-right">Latest</span>
          <span className="text-right">4-wk avg</span>
          <span className="text-right">Gap</span>
          <span>Streak</span>
        </div>

        {rows.map((row) => (
          <Link
            key={row.slug}
            href={`/cities/${row.slug}`}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-grill-lighter/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-grill transition-colors md:grid md:grid-cols-[2.5rem_minmax(0,1.4fr)_5.25rem_5.75rem_5.25rem_minmax(11rem,1.2fr)] md:gap-3 md:px-6"
          >
            <span className="bpi-number w-6 text-sm font-bold text-gray-300 dark:text-gray-600 md:w-auto">
              {row.rank}
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-medium text-sm text-gray-900 dark:text-white truncate block">
                {row.name}
                {row.state ? (
                  <span className="text-gray-400 dark:text-gray-500 ml-1">
                    {row.state}
                  </span>
                ) : null}
              </span>
              <span className="text-[11px] text-gray-400 md:hidden block">
                {money(row.latest)}
                {row.average != null && (
                  <>
                    <span className="mx-1">·</span>
                    avg {money(row.average)}
                  </>
                )}
              </span>
              {row.streak ? (
                <span
                  className={`text-[11px] md:hidden block ${streakTone(row.streakDirection)}`}
                >
                  {row.streak}
                </span>
              ) : null}
            </span>
            <span className="hidden md:block bpi-number text-sm font-bold text-right text-gray-900 dark:text-white">
              {money(row.latest)}
            </span>
            <span className="hidden md:block bpi-number text-sm text-right text-gray-700 dark:text-gray-300">
              {row.average == null ? "—" : money(row.average)}
            </span>
            <span
              className={`bpi-number text-sm font-bold text-right shrink-0 ${gapTone(row.gap)}`}
            >
              {row.gap == null ? "—" : formatMomentumGap(row.gap)}
            </span>
            <span
              className={`hidden md:block text-sm whitespace-nowrap ${streakTone(row.streakDirection)}`}
            >
              {row.streak ?? "—"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function money(amount: number | null): string {
  if (amount == null) return "—";
  return `$${amount.toFixed(2)}`;
}

function gapTone(gap: number | null): string {
  if (gap == null) return "text-gray-400";
  const cents = Math.round(gap * 100);
  if (cents > 0) return "text-negative dark:text-red-400";
  if (cents < 0) return "text-lettuce dark:text-lettuce-light";
  return "text-gray-400";
}

function streakTone(direction: StreakDirection | null): string {
  if (direction === "up") return "text-negative dark:text-red-400";
  if (direction === "down") return "text-lettuce dark:text-lettuce-light";
  return "text-gray-400";
}
