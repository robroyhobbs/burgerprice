import Link from "next/link";
import { getIndexFreshness } from "@/lib/week";

interface PrintDelayNoticeProps {
  /** Latest printed week (YYYY-MM-DD) on the dashboard. */
  weekOf: string | null | undefined;
}

function formatWeek(week: string): string {
  return new Date(`${week.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Honest "print delayed" strip. Renders only when the stored print is behind
 * the expected Monday week (same rule as /api/health index_fresh), so visitors
 * know the numbers below are last week's close, not this week's.
 */
export function PrintDelayNotice({ weekOf }: PrintDelayNoticeProps) {
  if (!weekOf) return null;
  const { index_fresh, expected_week } = getIndexFreshness(weekOf);
  if (index_fresh) return null;

  return (
    <section
      className="max-w-7xl mx-auto px-6 pt-4"
      aria-label="Weekly print status"
      id="print-status"
    >
      <div
        role="status"
        className="rounded-2xl border border-mustard/60 bg-mustard/10 dark:bg-mustard/5 px-5 py-3 text-sm text-gray-800 dark:text-gray-200"
      >
        <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-ketchup dark:text-mustard mr-2">
          Print delayed
        </span>
        The week of {formatWeek(expected_week)} print hasn&apos;t hit the tape
        yet. Numbers below are the last close, week of {formatWeek(weekOf)}.{" "}
        <Link
          href="/newsletter"
          className="underline underline-offset-2 hover:text-ketchup dark:hover:text-mustard"
        >
          Past editions
        </Link>
      </div>
    </section>
  );
}
