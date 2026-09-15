import Link from "next/link";

interface BpiExplainerProps {
  /** National average BPI for the current week (dollars). */
  avgBpi: number | null;
  /** Week-over-week change percent; null when no prior week. */
  changePct: number | null;
  /** Cities in this week's national average. */
  cityCount: number;
  /** Lowest-BPI city name, if known. */
  cheapestCity?: string | null;
  /** Highest-BPI city name, if known. */
  mostExpensiveCity?: string | null;
}

/**
 * Compact first-visit "what this means" strip — Bloomberg Terminal × Wendy's.
 * Sits under the national print so showdown stays above the fold.
 */
export function BpiExplainer({
  avgBpi,
  changePct,
  cityCount,
  cheapestCity = null,
  mostExpensiveCity = null,
}: BpiExplainerProps) {
  const print =
    avgBpi != null && !Number.isNaN(avgBpi) ? `$${avgBpi.toFixed(2)}` : null;

  let wowLine: string | null = null;
  if (changePct != null && !Number.isNaN(changePct)) {
    if (changePct === 0) {
      wowLine = "WoW is flat — the tape didn't move.";
    } else if (changePct > 0) {
      wowLine = `WoW ▲ ${changePct.toFixed(1)}% — burgers got pricier on the week.`;
    } else {
      wowLine = `WoW ▼ ${Math.abs(changePct).toFixed(1)}% — burgers got cheaper on the week.`;
    }
  }

  const extremes =
    cheapestCity && mostExpensiveCity
      ? `${cheapestCity} is the value print; ${mostExpensiveCity} is the premium.`
      : null;

  return (
    <section
      className="max-w-7xl mx-auto px-6 pb-2"
      aria-label="What the Burger Price Index means"
    >
      <div className="rounded-2xl border border-gray-200 dark:border-grill-lighter bg-white/80 dark:bg-grill-light/80 px-5 py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-ketchup dark:text-mustard">
              What this means
            </p>
            <p className="text-sm md:text-[15px] text-gray-800 dark:text-gray-200 leading-relaxed">
              <span className="font-medium text-gray-900 dark:text-white">
                BPI
              </span>{" "}
              is a weekly weighted average of fast-food, casual, and premium
              burger prices
              {cityCount > 0 ? (
                <>
                  {" "}
                  across{" "}
                  <span className="bpi-number font-semibold">{cityCount}</span>{" "}
                  cities
                </>
              ) : null}
              .{" "}
              {print ? (
                <>
                  The national number{" "}
                  <span className="bpi-number font-semibold text-gray-900 dark:text-white">
                    {print}
                  </span>{" "}
                  is this week&apos;s print on the tape.
                </>
              ) : (
                <>The national number is this week&apos;s print on the tape.</>
              )}
              {wowLine ? <> {wowLine}</> : null}
              {extremes ? <> {extremes}</> : null}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Next:{" "}
              <Link
                href="/cities"
                className="text-ketchup dark:text-mustard hover:underline font-medium"
              >
                pick a city
              </Link>
              <span className="text-gray-300 dark:text-gray-600 mx-1.5">·</span>
              <a
                href="#find-your-city"
                className="text-ketchup dark:text-mustard hover:underline font-medium"
              >
                near me
              </a>
              <span className="text-gray-300 dark:text-gray-600 mx-1.5">·</span>
              <a
                href="#city-showdown"
                className="text-ketchup dark:text-mustard hover:underline font-medium"
              >
                this week&apos;s showdown
              </a>
              <span className="text-gray-400 dark:text-gray-500">
                {" "}
                — the drive-thru doesn&apos;t care about your feelings.
              </span>
            </p>
          </div>

          <div className="flex-shrink-0 self-start">
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-grill-lighter bg-gray-50 dark:bg-grill px-3 py-1.5 text-[11px] font-medium tracking-wide text-gray-600 dark:text-gray-300 hover:border-ketchup/40 hover:text-ketchup dark:hover:border-mustard/40 dark:hover:text-mustard transition-colors"
            >
              How we print
              <span aria-hidden className="text-ketchup dark:text-mustard">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
