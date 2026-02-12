import type { IndustryNewsItem } from "@/lib/types";

interface IndustryNewsProps {
  news: IndustryNewsItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  "supply-chain": "Supply Chain",
  regulation: "Regulation",
  market: "Market",
  consumer: "Consumer",
  "wild-card": "Wild Card",
};

const IMPACT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bullish: {
    label: "Bullish",
    color: "text-negative dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30",
  },
  bearish: {
    label: "Bearish",
    color: "text-lettuce dark:text-lettuce-light",
    bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30",
  },
  neutral: {
    label: "Neutral",
    color: "text-gray-500",
    bg: "bg-gray-50 dark:bg-grill border-gray-100 dark:border-grill-lighter",
  },
};

export function IndustryNews({ news }: IndustryNewsProps) {
  if (news.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
          📡
        </div>
        <div>
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
            Industry Wire
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Stories impacting burger prices this week
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {news.map((item) => {
          const impact = IMPACT_CONFIG[item.impact] ?? IMPACT_CONFIG.neutral;
          const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;

          return (
            <article
              key={item.id}
              className={`rounded-2xl border p-6 transition-all hover:shadow-md ${impact.bg}`}
            >
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500">
                  {categoryLabel}
                </span>
                <span className="text-gray-200 dark:text-grill-lighter">|</span>
                <span className={`text-[10px] uppercase tracking-widest font-bold ${impact.color}`}>
                  {impact.label} for prices
                </span>
                {item.source && (
                  <>
                    <span className="text-gray-200 dark:text-grill-lighter">|</span>
                    <span className="text-[10px] text-gray-400 italic">
                      {item.source}
                    </span>
                  </>
                )}
              </div>
              <h3 className="font-headline text-lg text-gray-900 dark:text-white leading-snug mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {item.summary}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
