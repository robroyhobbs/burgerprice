import type { CityDashboardData } from "@/lib/types";
import { vsNationalPct } from "@/lib/bpi";
import Link from "next/link";
import { buildRankMovements, type RankMove } from "@/lib/rank-ladder";
import { formatTapeWeek } from "@/lib/city-readout";

function MoveBadge({ move }: { move: RankMove | undefined }) {
  if (!move || move.delta == null || move.prevRank == null) return null;
  if (move.delta === 0) {
    return (
      <span
        className="bpi-number block text-[10px] font-bold text-gray-400 leading-none mt-1"
        title={`Held at #${move.rank}`}
        aria-label={`Held at number ${move.rank}`}
      >
        =
      </span>
    );
  }
  const up = move.delta > 0;
  const spots = Math.abs(move.delta);
  const unit = spots === 1 ? "spot" : "spots";
  return (
    <span
      className={`bpi-number block text-[10px] font-bold leading-none mt-1 ${
        up
          ? "text-negative dark:text-red-400"
          : "text-lettuce dark:text-lettuce-light"
      }`}
      title={`${up ? "Up" : "Down"} ${spots} ${unit}: from #${move.prevRank} to #${move.rank}`}
      aria-label={`${up ? "Up" : "Down"} ${spots} ${unit}, from number ${move.prevRank} to number ${move.rank}`}
    >
      {up ? "▲" : "▼"}
      {spots}
    </span>
  );
}

interface LeaderboardProps {
  cities: CityDashboardData[];
  /** When true (default on homepage), show a link to the full /rankings page. */
  showFullPageLink?: boolean;
  /** Current-week national BPI (avg across tracked cities). */
  nationalBpi?: number | null;
}

export function Leaderboard({
  cities,
  showFullPageLink = true,
  nationalBpi = null,
}: LeaderboardProps) {
  // Sort cities by BPI score descending, cities without data go last
  const ranked = [...cities]
    .map((c) => ({
      ...c,
      bpi: c.currentSnapshot?.bpi_score ?? null,
      change: c.currentSnapshot?.change_pct ?? null,
    }))
    .sort((a, b) => {
      if (a.bpi === null && b.bpi === null) return 0;
      if (a.bpi === null) return 1;
      if (b.bpi === null) return -1;
      return b.bpi - a.bpi;
    });

  const moves = buildRankMovements(cities);
  const compared = Array.from(moves.values()).find((m) => m.prevWeekOf != null);
  const prevWeekLabel = compared?.prevWeekOf
    ? formatTapeWeek(compared.prevWeekOf)
    : null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
            🏆
          </div>
          <div>
            <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
              National BPI Rankings
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {ranked.length} cities tracked &middot; Updated weekly
            </p>
          </div>
        </div>
        {showFullPageLink && (
          <Link
            href="/rankings"
            className="text-sm font-medium text-ketchup dark:text-mustard hover:underline whitespace-nowrap"
          >
            Full rankings →
          </Link>
        )}
      </div>

      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[3rem_1fr_6rem_5rem] md:grid-cols-[3rem_1fr_7rem_6rem] gap-2 px-6 py-3 border-b border-gray-100 dark:border-grill-lighter text-[10px] uppercase tracking-widest text-gray-400 font-medium">
          <span>#</span>
          <span>City</span>
          <span className="text-right">BPI</span>
          <span className="text-right">Chg</span>
        </div>

        {/* Rows */}
        {ranked.map((item, index) => {
          const rank = index + 1;
          const isPositive = item.change !== null && item.change > 0;
          const isNegative = item.change !== null && item.change < 0;
          const vsNational = vsNationalPct(item.bpi, nationalBpi);

          return (
            <Link
              key={item.city.slug}
              href={`/cities/${item.city.slug}`}
              className="grid grid-cols-[3rem_1fr_6rem_5rem] md:grid-cols-[3rem_1fr_7rem_6rem] gap-2 px-6 py-4 border-b border-gray-50 dark:border-grill-lighter/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-grill transition-colors items-center"
            >
              <span>
                <span className="bpi-number text-sm font-bold text-gray-300 dark:text-gray-600 block leading-none">
                  {rank}
                </span>
                <MoveBadge move={moves.get(item.city.slug)} />
              </span>
              <div className="min-w-0">
                <span className="font-medium text-sm text-gray-900 dark:text-white truncate block">
                  {item.city.name}
                  <span className="text-gray-400 dark:text-gray-500 ml-1">
                    {item.city.state}
                  </span>
                </span>
                {vsNational !== null && nationalBpi !== null && (
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
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
              </div>
              <span className="bpi-number text-sm font-bold text-right text-gray-900 dark:text-white">
                {item.bpi !== null ? `$${item.bpi.toFixed(2)}` : "—"}
              </span>
              <span
                className={`bpi-number text-xs font-bold text-right ${
                  isPositive
                    ? "text-negative dark:text-red-400"
                    : isNegative
                      ? "text-lettuce dark:text-lettuce-light"
                      : "text-gray-400"
                }`}
              >
                {item.change !== null && item.change !== 0
                  ? `${isPositive ? "+" : ""}${item.change.toFixed(1)}%`
                  : "—"}
              </span>
            </Link>
          );
        })}
      </div>
      {prevWeekLabel && (
        <p className="mt-3 text-xs text-gray-400">
          Rank arrows compare each city&apos;s spot with the prior available
          print (week of {prevWeekLabel}). ▲ moved up the board (pricier), ▼
          moved down (cheaper), = held.
        </p>
      )}
    </section>
  );
}
