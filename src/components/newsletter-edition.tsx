"use client";

import type { NewsletterContent } from "@/lib/types";
import type { TapeSameStoreRead } from "@/lib/same-store";
import Link from "next/link";

interface NewsletterEditionProps {
  weekOf: string;
  headline: string;
  sections: NewsletterContent;
  /** Same-store read per tape city, keyed by cityNameKey(city). */
  sameStore?: Record<string, TapeSameStoreRead>;
}

function tapeKey(name: string): string {
  return name.split(",")[0].toLowerCase().replace(/[^a-z]+/g, "");
}

function signedPct(pct: number): string {
  if (pct === 0) return "flat";
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function TapeSameStoreLine({ read }: { read: TapeSameStoreRead }) {
  const tag =
    read.read === "mix"
      ? { label: "BASKET MIX", cls: "text-yellow-400 border-yellow-500/40" }
      : read.read === "real"
        ? { label: "REAL MOVE", cls: "text-green-400 border-green-500/40" }
        : read.read === "new-basket"
          ? { label: "NEW BASKET", cls: "text-gray-400 border-gray-500/40" }
          : null;
  const body =
    read.sameStore == null
      ? `same-store: no carried-over spots (0/${read.total})`
      : `same-store ${signedPct(read.sameStore)} (${read.carried}/${read.total} spots priced both weeks)`;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-gray-500 mt-1">
      {tag && (
        <span className={`border rounded px-1.5 py-0.5 tracking-widest ${tag.cls}`}>
          {tag.label}
        </span>
      )}
      {read.isLatest ? (
        <Link
          href={`/cities/${read.slug}#same-store`}
          className="hover:text-green-400 underline decoration-dotted"
        >
          {body}
        </Link>
      ) : (
        <span>{body}</span>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function NewsletterEdition({
  weekOf,
  headline,
  sections,
  sameStore,
}: NewsletterEditionProps) {
  const tapeReads = sameStore
    ? sections.theTape.map((m) => sameStore[tapeKey(m.city)]).filter(Boolean)
    : [];
  const mixCount = tapeReads.filter((r) => r.read === "mix").length;
  return (
    <article className="max-w-4xl mx-auto">
      {/* Terminal Header */}
      <div className="bg-[#0a0a14] border border-[#1a3a1a] rounded-t-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="ml-2 text-[10px] text-green-500/60 font-mono uppercase tracking-widest">
            BPI Terminal — Weekly Edition
          </span>
        </div>
        <div className="text-[10px] text-green-500/50 font-mono mb-3">
          {formatDate(weekOf)} &middot; Vol. I &middot; burgerprice.com
        </div>
        <h1 className="font-headline text-2xl md:text-4xl text-green-400 leading-tight">
          {headline}
        </h1>
      </div>

      {/* Market Overview */}
      <Section title="MARKET OVERVIEW" icon="📊">
        <Prose text={sections.marketOverview} />
      </Section>

      {/* The Tape */}
      <Section title="THE TAPE" icon="📈">
        <div className="space-y-2">
          {sections.theTape.map((mover) => (
            <div
              key={mover.city}
              className="flex items-start gap-3 font-mono text-sm"
            >
              <span
                className={`font-bold min-w-[3rem] ${
                  mover.direction === "up"
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {mover.direction === "up" ? "▲" : "▼"}{" "}
                {Math.abs(mover.changePct).toFixed(1)}%
              </span>
              <span className="text-gray-200 font-bold min-w-[8rem]">
                {mover.city}
              </span>
              <div className="flex-1">
                <span className="text-gray-400">{mover.commentary}</span>
                {sameStore?.[tapeKey(mover.city)] && (
                  <TapeSameStoreLine read={sameStore[tapeKey(mover.city)]} />
                )}
              </div>
            </div>
          ))}
        </div>
        {tapeReads.length > 0 && (
          <p className="mt-4 text-[11px] font-mono text-green-500/60 leading-relaxed">
            🧾 Same-store footnote: {mixCount} of {tapeReads.length} tape moves this
            week are mostly basket mix (a 5-pt+ gap between the headline and the
            restaurants priced both weeks).{" "}
            <Link href="/rankings#same-store-board" className="underline hover:text-green-400">
              See the Same-Store Board →
            </Link>
          </p>
        )}
      </Section>

      {/* City Spotlight */}
      <Section title={`CITY SPOTLIGHT: ${sections.citySpotlight.city.toUpperCase()}`} icon="🏙️">
        <Prose text={sections.citySpotlight.narrative} />
      </Section>

      {/* Burger of the Week */}
      <Section title="BURGER OF THE WEEK" icon="🍔">
        <div className="bg-[#0f1a0f] border border-[#1a3a1a] rounded-xl p-5 mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="text-green-300 font-bold text-lg font-mono">
              {sections.burgerOfTheWeek.burger}
            </h4>
            <span className="text-green-400 font-mono font-bold text-xl">
              ${sections.burgerOfTheWeek.price.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-gray-500 font-mono mb-3">
            {sections.burgerOfTheWeek.restaurant} &middot;{" "}
            {sections.burgerOfTheWeek.city}
          </div>
        </div>
        <Prose text={sections.burgerOfTheWeek.review} />
      </Section>

      {/* The Spread */}
      <Section title="THE SPREAD" icon="📏">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#0f1a0f] border border-[#1a3a1a] rounded-xl p-4 text-center">
            <div className="text-[10px] text-green-500/60 font-mono uppercase tracking-widest mb-1">
              National Low
            </div>
            <div className="text-green-400 font-mono font-bold text-2xl">
              ${sections.theSpread.cheapest.price.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 font-mono mt-1">
              {sections.theSpread.cheapest.restaurant}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              {sections.theSpread.cheapest.city}
            </div>
          </div>
          <div className="bg-[#1a0f0f] border border-[#3a1a1a] rounded-xl p-4 text-center">
            <div className="text-[10px] text-red-500/60 font-mono uppercase tracking-widest mb-1">
              National High
            </div>
            <div className="text-red-400 font-mono font-bold text-2xl">
              ${sections.theSpread.mostExpensive.price.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 font-mono mt-1">
              {sections.theSpread.mostExpensive.restaurant}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              {sections.theSpread.mostExpensive.city}
            </div>
          </div>
        </div>
        <Prose text={sections.theSpread.commentary} />
      </Section>

      {/* Analyst's Corner */}
      <Section title={`ANALYST'S CORNER: ${sections.analystsCorner.title.toUpperCase()}`} icon="🎩">
        <Prose text={sections.analystsCorner.essay} />
      </Section>

      {/* Footer */}
      <div className="bg-[#0a0a14] border border-[#1a3a1a] border-t-0 rounded-b-2xl p-6 text-center">
        <p className="text-[10px] text-green-500/40 font-mono">
          BPI WEEKLY &middot; The Burger Price Index &middot; Est. 2026 &middot;{" "}
          <Link
            href="/newsletter"
            className="underline hover:text-green-400 transition-colors"
          >
            View All Editions
          </Link>
        </p>
      </div>
    </article>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0d0d1a] border-x border-[#1a3a1a] p-6 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h2 className="text-[11px] text-green-500/80 font-mono font-bold uppercase tracking-[0.2em]">
          {title}
        </h2>
      </div>
      <div className="border-t border-[#1a3a1a] pt-4">{children}</div>
    </div>
  );
}

function Prose({ text }: { text: string }) {
  const paragraphs = text.split("\n\n").filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm text-gray-300 leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  );
}
