import Link from "next/link";
import type { CityDashboardData } from "@/lib/types";

export type MoverCity = CityDashboardData & {
  bpi: number | null;
  change: number | null;
};

interface BiggestMoversProps {
  cities: CityDashboardData[];
  /** Max risers / fallers to show (default 3). */
  limit?: number;
  /** When true, link to full /rankings movers context. */
  showFullPageLink?: boolean;
}

/**
 * Week-over-week BPI swingers — top risers and fallers.
 * Shared by homepage and /rankings so the fresh print surfaces on both.
 */
export function BiggestMovers({
  cities,
  limit = 3,
  showFullPageLink = false,
}: BiggestMoversProps) {
  const ranked: MoverCity[] = cities.map((c) => ({
    ...c,
    bpi: c.currentSnapshot?.bpi_score ?? null,
    change: c.currentSnapshot?.change_pct ?? null,
  }));

  const withChange = ranked.filter(
    (c): c is MoverCity & { change: number } =>
      c.change !== null && c.change !== 0,
  );
  const risers = [...withChange]
    .sort((a, b) => b.change - a.change)
    .slice(0, limit);
  const fallers = [...withChange]
    .sort((a, b) => a.change - b.change)
    .slice(0, limit);

  if (risers.length === 0 && fallers.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-8" aria-labelledby="biggest-movers">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
            📈
          </div>
          <div>
            <h2
              id="biggest-movers"
              className="font-headline text-2xl text-ketchup dark:text-mustard leading-none"
            >
              Biggest Movers
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Week-over-week BPI swings
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <MoverColumn
          title="Risers"
          subtitle="Prices heating up"
          items={risers}
          tone="up"
        />
        <MoverColumn
          title="Fallers"
          subtitle="Prices cooling off"
          items={fallers}
          tone="down"
        />
      </div>
    </section>
  );
}

function MoverColumn({
  title,
  subtitle,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  items: MoverCity[];
  tone: "up" | "down";
}) {
  return (
    <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-grill-lighter">
        <h3 className="font-headline text-lg text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-6 text-sm text-gray-400">No movers this week.</p>
      ) : (
        items.map((item) => {
          const isUp = (item.change ?? 0) > 0;
          return (
            <Link
              key={item.city.slug}
              href={`/cities/${item.city.slug}`}
              className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-50 dark:border-grill-lighter/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-grill transition-colors"
            >
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {item.city.name}
                  <span className="text-gray-400 ml-1">{item.city.state}</span>
                </p>
                <p className="bpi-number text-xs text-gray-400 mt-0.5">
                  {item.bpi != null ? `$${item.bpi.toFixed(2)}` : "—"}
                </p>
              </div>
              <span
                className={`bpi-number text-sm font-bold ${
                  tone === "up" || isUp
                    ? "text-negative dark:text-red-400"
                    : "text-lettuce dark:text-lettuce-light"
                }`}
              >
                {item.change != null
                  ? `${item.change > 0 ? "+" : ""}${item.change.toFixed(1)}%`
                  : "—"}
              </span>
            </Link>
          );
        })
      )}
    </div>
  );
}
