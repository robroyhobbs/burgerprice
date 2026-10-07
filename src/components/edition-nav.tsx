import Link from "next/link";

export interface EditionLink {
  week_of: string;
  headline: string;
}

interface EditionNavProps {
  older: EditionLink | null;
  newer: EditionLink | null;
}

function shortWeek(weekOf: string): string {
  return new Date(weekOf + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Older / newer edition links under a newsletter issue, so readers can page
 * through the tape instead of bouncing back to the archive list.
 */
export function EditionNav({ older, newer }: EditionNavProps) {
  return (
    <nav
      aria-label="Newsletter editions"
      className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch"
    >
      {older ? (
        <Link
          href={`/newsletter/${older.week_of}`}
          rel="prev"
          className="group bg-[#0d0d1a] border border-[#1a3a1a] rounded-2xl px-5 py-4 hover:border-green-500/40 transition-colors"
        >
          <span className="block text-[10px] text-green-500/60 font-mono font-bold uppercase tracking-[0.2em]">
            ← Older edition
          </span>
          <span className="block mt-1 text-xs text-gray-500 font-mono">
            Week of {shortWeek(older.week_of)}
          </span>
          <span className="block mt-1 text-sm text-gray-200 group-hover:text-white line-clamp-2">
            {older.headline}
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" className="hidden sm:block" />
      )}

      <Link
        href="/newsletter"
        className="flex items-center justify-center bg-[#0d0d1a] border border-[#1a3a1a] rounded-2xl px-5 py-4 text-[11px] text-green-400 font-mono font-bold uppercase tracking-[0.2em] hover:border-green-500/40 transition-colors"
      >
        All editions
      </Link>

      {newer ? (
        <Link
          href={`/newsletter/${newer.week_of}`}
          rel="next"
          className="group bg-[#0d0d1a] border border-[#1a3a1a] rounded-2xl px-5 py-4 text-right hover:border-green-500/40 transition-colors"
        >
          <span className="block text-[10px] text-green-500/60 font-mono font-bold uppercase tracking-[0.2em]">
            Newer edition →
          </span>
          <span className="block mt-1 text-xs text-gray-500 font-mono">
            Week of {shortWeek(newer.week_of)}
          </span>
          <span className="block mt-1 text-sm text-gray-200 group-hover:text-white line-clamp-2">
            {newer.headline}
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" className="hidden sm:block" />
      )}
    </nav>
  );
}
