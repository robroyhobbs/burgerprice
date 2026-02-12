import type { MarketReport as MarketReportType } from "@/lib/types";

interface MarketReportProps {
  report: MarketReportType | null;
}

export function MarketReport({ report }: MarketReportProps) {
  if (!report) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
          📰
        </div>
        <div>
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
            Market Report
          </h2>
          <p className="text-xs text-gray-400 mt-1 bpi-number">
            Week of {formatDate(report.week_of)}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
        {/* Headline banner */}
        <div className="bg-gradient-to-r from-grill to-grill-light dark:from-grill-lighter dark:to-grill px-8 md:px-10 py-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-mustard font-semibold mb-3">
            Breaking
          </p>
          <h3 className="font-headline text-xl md:text-2xl text-white leading-snug">
            {report.headline}
          </h3>
        </div>

        {/* Summary */}
        <div className="px-8 md:px-10 py-8">
          <div className="text-base text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
            {report.summary.split("\n").filter(Boolean).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Market Factors */}
        {report.factors.length > 0 && (
          <div className="px-8 md:px-10 pb-8">
            <h4 className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-400 dark:text-gray-500 mb-4">
              Key Market Drivers
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              {report.factors.map((factor, i) => {
                const bg =
                  factor.impact === "up"
                    ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30"
                    : factor.impact === "down"
                      ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
                      : "bg-gray-50 dark:bg-grill border-gray-100 dark:border-grill-lighter";

                const icon =
                  factor.impact === "up" ? "▲" : factor.impact === "down" ? "▼" : "●";

                const iconColor =
                  factor.impact === "up"
                    ? "text-negative"
                    : factor.impact === "down"
                      ? "text-lettuce"
                      : "text-gray-400";

                return (
                  <div
                    key={i}
                    className={`rounded-2xl p-5 border ${bg}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs ${iconColor}`}>{icon}</span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {factor.factor}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {factor.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
