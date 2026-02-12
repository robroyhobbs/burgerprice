import type { MarketReport as MarketReportType } from "@/lib/types";

interface MarketReportProps {
  report: MarketReportType | null;
}

export function MarketReport({ report }: MarketReportProps) {
  if (!report) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-sm">
          📰
        </div>
        <div>
          <h2 className="font-headline text-xl text-ketchup dark:text-mustard leading-none">
            Market Report
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5 bpi-number">
            Week of {formatDate(report.week_of)}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter overflow-hidden">
        {/* Headline banner */}
        <div className="bg-gradient-to-r from-grill to-grill-light dark:from-grill-lighter dark:to-grill px-6 md:px-8 py-5">
          <p className="text-[9px] uppercase tracking-[0.2em] text-mustard font-semibold mb-2">
            Breaking
          </p>
          <h3 className="font-headline text-lg md:text-xl text-white leading-snug">
            {report.headline}
          </h3>
        </div>

        {/* Summary */}
        <div className="px-6 md:px-8 py-6">
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-3">
            {report.summary.split("\n").filter(Boolean).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Market Factors */}
        {report.factors.length > 0 && (
          <div className="px-6 md:px-8 pb-6">
            <h4 className="text-[9px] uppercase tracking-[0.2em] font-bold text-gray-400 dark:text-gray-500 mb-3">
              Key Market Drivers
            </h4>
            <div className="grid gap-2 md:grid-cols-3">
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
                    className={`rounded-xl p-3.5 border ${bg}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] ${iconColor}`}>{icon}</span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {factor.factor}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
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
