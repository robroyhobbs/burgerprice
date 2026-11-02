import Link from "next/link";
import type { LadderCity, RankLadder } from "@/lib/rank-ladder";
import { formatTapeWeek } from "@/lib/city-readout";

function ordinalNote(ladder: RankLadder): string {
  if (ladder.total <= 1) return "Only print on the board so far.";
  if (ladder.rank === 1) return "Top of the board. Nobody pays more for a burger.";
  if (ladder.rank === ladder.total)
    return "Bottom of the board. The value play, for now.";
  return `${ladder.rank - 1} ${ladder.rank - 1 === 1 ? "market" : "markets"} pricier, ${
    ladder.total - ladder.rank
  } cheaper.`;
}

function Neighbor({
  label,
  city,
  selfBpi,
  emptyText,
}: {
  label: string;
  city: LadderCity | null;
  selfBpi: number;
  emptyText: string;
}) {
  if (!city) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-grill-lighter p-4">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">
          {label}
        </p>
        <p className="text-sm text-gray-400">{emptyText}</p>
      </div>
    );
  }
  const gap = city.bpi - selfBpi;
  return (
    <Link
      href={`/cities/${city.slug}`}
      className="rounded-2xl border border-gray-200 dark:border-grill-lighter p-4 hover:border-ketchup/30 dark:hover:border-mustard/30 transition-all"
    >
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">
        {label}
      </p>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-sm text-gray-900 dark:text-white">
          <span className="bpi-number text-gray-400 mr-1">#{city.rank}</span>
          {city.name}, {city.state}
        </p>
        <span className="bpi-number text-lg font-bold text-gray-900 dark:text-white shrink-0">
          ${city.bpi.toFixed(2)}
        </span>
      </div>
      <p className="bpi-number text-xs text-gray-400 mt-1">
        {gap >= 0 ? "+" : "−"}${Math.abs(gap).toFixed(2)} vs here
      </p>
    </Link>
  );
}

export function RankLadderBlock({
  ladder,
  cityName,
}: {
  ladder: RankLadder;
  cityName: string;
}) {
  const week = ladder.weekOf ? formatTapeWeek(ladder.weekOf) : null;
  return (
    <section
      className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-6 mb-8"
      aria-labelledby="where-it-ranks-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2
          id="where-it-ranks-heading"
          className="font-headline text-lg text-gray-900 dark:text-white"
        >
          Where {cityName} ranks
        </h2>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
          Latest print{week ? ` · week of ${week}` : ""}
        </p>
      </div>
      <p className="mb-4">
        <span className="bpi-number text-2xl font-bold text-ketchup dark:text-mustard">
          #{ladder.rank} of {ladder.total}
        </span>
        <span className="text-sm text-gray-400 ml-2">priciest first</span>
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {ordinalNote(ladder)}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Neighbor
          label="Next pricier"
          city={ladder.pricier}
          selfBpi={ladder.bpi}
          emptyText={`None. ${cityName} is the priciest market we track.`}
        />
        <Neighbor
          label="Next cheaper"
          city={ladder.cheaper}
          selfBpi={ladder.bpi}
          emptyText={`None. ${cityName} is the cheapest market we track.`}
        />
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Full board on{" "}
        <Link
          href="/rankings"
          className="text-ketchup dark:text-mustard hover:underline"
        >
          the weekly rankings
        </Link>
        .
      </p>
    </section>
  );
}
