import type { MarketReport as MarketReportType } from "@/lib/types";

interface MarketReportProps {
  report: MarketReportType | null;
}

export function MarketReport({ report }: MarketReportProps) {
  if (!report) {
    return (
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="font-headline text-xl text-ketchup dark:text-mustard mb-4">
          Weekly Market Report
        </h2>
        <div className="bg-white dark:bg-grill-light rounded-xl border border-gray-200 dark:border-grill-lighter p-6 text-center text-gray-400">
          No report available for this week.
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📰</span>
        <h2 className="font-headline text-xl text-ketchup dark:text-mustard">
          Weekly Market Report
        </h2>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-xl border border-gray-200 dark:border-grill-lighter p-6 md:p-8">
        {/* Headline */}
        <h3 className="font-headline text-xl md:text-2xl text-gray-900 dark:text-white leading-tight mb-4">
          &ldquo;{report.headline}&rdquo;
        </h3>

        {/* Summary */}
        <div className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
          {report.summary.split("\n").filter(Boolean).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* Market Factors */}
        {report.factors.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-grill-lighter">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-3">
              Key Market Factors
            </h4>
            <div className="grid gap-3 md:grid-cols-3">
              {report.factors.map((factor, i) => (
                <div
                  key={i}
                  className="bg-gray-50 dark:bg-grill rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">
                      {factor.impact === "up"
                        ? "📈"
                        : factor.impact === "down"
                          ? "📉"
                          : "➡️"}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {factor.factor}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {factor.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date stamp */}
        <div className="mt-6 text-[10px] text-gray-400 text-right bpi-number">
          Report for week of {formatDate(report.week_of)}
        </div>
      </div>
    </section>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
