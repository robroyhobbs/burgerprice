import Link from "next/link";
import type { PurchasingPowerBoardRow } from "@/lib/purchasing-power-rank";

/**
 * Purchasing-power board for /rankings.
 * Rows are already ranked (most burgers/hr first). Null or a single row
 * hides the section — same threshold as the board builder.
 */
export function PurchasingPowerBoard({
  rows,
}: {
  rows: readonly PurchasingPowerBoardRow[] | null;
}) {
  if (!rows || rows.length < 2) return null;

  return (
    <section
      id="purchasing-power"
      className="max-w-7xl mx-auto px-6 py-8"
      aria-labelledby="purchasing-power-heading"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
          💪
        </div>
        <div>
          <h2
            id="purchasing-power-heading"
            className="font-headline text-2xl text-ketchup dark:text-mustard leading-none"
          >
            Purchasing Power Board
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Burgers an hour of minimum wage buys, at this week&apos;s BPI
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-grill-lighter text-[10px] uppercase tracking-widest text-gray-400 font-medium sm:hidden">
          <span className="w-6">#</span>
          <span className="flex-1">City</span>
          <span className="text-right">Burgers/hr</span>
        </div>
        <div className="hidden sm:grid sm:grid-cols-[2.5rem_1fr_5.5rem_5.25rem_5.75rem] gap-3 px-6 py-3 border-b border-gray-100 dark:border-grill-lighter text-[10px] uppercase tracking-widest text-gray-400 font-medium">
          <span>#</span>
          <span>City</span>
          <span className="text-right">Min wage</span>
          <span className="text-right">BPI</span>
          <span className="text-right">Burgers/hr</span>
        </div>

        {rows.map((row) => (
          <Link
            key={row.slug}
            href={`/cities/${row.slug}`}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-grill-lighter/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-grill transition-colors sm:grid sm:grid-cols-[2.5rem_1fr_5.5rem_5.25rem_5.75rem] sm:gap-3 sm:px-6"
          >
            <span className="bpi-number w-6 text-sm font-bold text-gray-300 dark:text-gray-600 sm:w-auto">
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
              <span className="text-[11px] text-gray-400 sm:hidden">
                ${row.minWage.toFixed(2)}/hr
                <span className="mx-1">·</span>
                BPI ${row.bpi.toFixed(2)}
              </span>
            </span>
            <span className="hidden sm:block bpi-number text-sm text-right text-gray-700 dark:text-gray-300">
              ${row.minWage.toFixed(2)}
            </span>
            <span className="hidden sm:block bpi-number text-sm font-bold text-right text-gray-900 dark:text-white">
              ${row.bpi.toFixed(2)}
            </span>
            <span className="bpi-number text-sm font-bold text-right text-ketchup dark:text-mustard">
              {row.burgersPerHour.toFixed(1)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
