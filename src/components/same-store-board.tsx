import Link from "next/link";
import type { CityDashboardData, RawPrice } from "@/lib/types";
import { buildSameStoreCheck } from "@/lib/same-store";

/** Headline gap (pct points) at which we call the move basket mix, matching city pages. */
const MIX_GAP = 5;

interface BoardRow {
  slug: string;
  name: string;
  state: string;
  headline: number | null;
  sameStore: number | null;
  carried: number;
  total: number;
  gap: number | null;
}

function signed(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return "—";
  if (pct === 0) return "flat";
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function tone(pct: number | null): string {
  if (pct == null || pct === 0) return "text-gray-400";
  return pct > 0
    ? "text-negative dark:text-red-400"
    : "text-lettuce dark:text-lettuce-light";
}

export function buildSameStoreBoard(cities: CityDashboardData[]): BoardRow[] {
  const rows: BoardRow[] = [];
  for (const c of cities) {
    if (!c.currentSnapshot || !c.previousSnapshot) continue;
    const check = buildSameStoreCheck(
      (c.currentSnapshot.raw_prices ?? []) as RawPrice[],
      (c.previousSnapshot.raw_prices ?? []) as RawPrice[],
    );
    if (!check) continue;
    const headline = c.currentSnapshot.change_pct ?? null;
    const sameStore = check.avgChangePct;
    rows.push({
      slug: c.city.slug,
      name: c.city.name,
      state: c.city.state,
      headline,
      sameStore,
      carried: check.rows.length,
      total: check.currentCount,
      gap:
        headline != null && sameStore != null
          ? Math.abs(headline - sameStore)
          : null,
    });
  }
  // Biggest headline-vs-menu-board gap first: that's where the print needs a footnote.
  return rows.sort((a, b) => (b.gap ?? -1) - (a.gap ?? -1));
}

/**
 * Same-Store Board — every city's headline WoW next to the move at restaurants
 * priced both weeks. Tells readers which swings are menu boards vs. basket mix.
 */
export function SameStoreBoard({ cities }: { cities: CityDashboardData[] }) {
  const rows = buildSameStoreBoard(cities);
  if (rows.length === 0) return null;
  const mixCount = rows.filter((r) => r.gap != null && r.gap >= MIX_GAP).length;

  return (
    <section
      id="same-store-board"
      className="max-w-7xl mx-auto px-6 py-8 scroll-mt-24"
      aria-labelledby="same-store-board-heading"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
          🧾
        </div>
        <div>
          <h2
            id="same-store-board-heading"
            className="font-headline text-2xl text-ketchup dark:text-mustard leading-none"
          >
            Same-Store Board
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Headline WoW vs. restaurants priced both weeks
          </p>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl mb-6">
        {mixCount === 0
          ? "Every city's headline move tracks its carried-over spots this week. The menu boards did the moving."
          : `${mixCount} of ${rows.length} headline moves are mostly basket mix, not menu-board changes. Big swings get a footnote here before they get a headline.`}
      </p>

      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 text-left border-b border-gray-100 dark:border-grill-lighter">
              <th scope="col" className="px-6 py-3 font-medium">City</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Headline WoW</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Same-store</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Carried over</th>
              <th scope="col" className="px-6 py-3 font-medium text-right">Read</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isMix = r.gap != null && r.gap >= MIX_GAP;
              const read =
                r.sameStore == null
                  ? "New basket"
                  : r.headline == null
                    ? "—"
                    : isMix
                      ? "Basket mix"
                      : "Real move";
              return (
                <tr
                  key={r.slug}
                  className="border-b last:border-b-0 border-gray-100 dark:border-grill-lighter hover:bg-gray-50 dark:hover:bg-grill transition-colors"
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/cities/${r.slug}#same-store`}
                      className="font-medium text-gray-900 dark:text-white hover:text-ketchup dark:hover:text-mustard"
                    >
                      {r.name}
                      <span className="text-gray-400 ml-1">{r.state}</span>
                    </Link>
                  </td>
                  <td className={`bpi-number px-4 py-3 text-right font-bold ${tone(r.headline)}`}>
                    {signed(r.headline)}
                  </td>
                  <td className={`bpi-number px-4 py-3 text-right font-bold ${tone(r.sameStore)}`}>
                    {signed(r.sameStore)}
                  </td>
                  <td className="bpi-number px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                    {r.carried}/{r.total}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        isMix || r.sameStore == null
                          ? "bg-mustard/15 text-amber-700 dark:text-mustard"
                          : "bg-gray-100 dark:bg-grill text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {read}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Same-store is the average per-restaurant price change across spots on both weeks&apos; tape. A gap of {MIX_GAP}+ points from the headline reads as basket mix. Tap a city for the restaurant-by-restaurant table.
      </p>
    </section>
  );
}
