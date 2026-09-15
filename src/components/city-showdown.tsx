import type { CityDashboardData } from "@/lib/types";
import { BpiCard } from "./bpi-card";
import { ShareStrip } from "./share-strip";
import { buildShowdownCaption, showdownShareUrl } from "@/lib/share";
import { isFreshShowdownWeek } from "@/lib/week";

interface CityShowdownProps {
  cities: CityDashboardData[];
  weekOf?: string;
}

function formatWeekLabel(weekOf: string): string {
  const d = new Date(`${weekOf}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return weekOf;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function showdownTagline(
  city1: CityDashboardData,
  city2: CityDashboardData
): string {
  const bpi1 = city1.currentSnapshot?.bpi_score ?? 0;
  const bpi2 = city2.currentSnapshot?.bpi_score ?? 0;
  const gap = Math.abs(bpi1 - bpi2);
  const gapText = `$${gap.toFixed(2)}`;

  if (gap < 0.01) {
    return `${city1.city.name} and ${city2.city.name} are locked at parity. Markets hate a draw.`;
  }

  const leader = bpi1 > bpi2 ? city1.city.name : city2.city.name;
  const underdog = bpi1 > bpi2 ? city2.city.name : city1.city.name;
  return `${leader} leads by ${gapText}. ${underdog} is the value trade this week.`;
}

export function CityShowdown({ cities, weekOf }: CityShowdownProps) {
  if (cities.length < 2) return null;

  const [city1, city2] = cities;
  const bpi1 = city1.currentSnapshot?.bpi_score ?? 0;
  const bpi2 = city2.currentSnapshot?.bpi_score ?? 0;
  const isTie = Math.abs(bpi1 - bpi2) < 0.01;
  const weekLabel = weekOf ? formatWeekLabel(weekOf) : null;
  const tagline = showdownTagline(city1, city2);
  const fresh = weekOf ? isFreshShowdownWeek(weekOf) : false;

  const shareUrl = showdownShareUrl(city1.city.slug, city2.city.slug);
  const caption = buildShowdownCaption({
    leftName: city1.city.name,
    leftBpi: bpi1,
    rightName: city2.city.name,
    rightBpi: bpi2,
    weekOf: weekOf || city1.currentSnapshot?.week_of || "",
    leftSlug: city1.city.slug,
    rightSlug: city2.city.slug,
    fresh,
  });

  return (
    <section className="max-w-7xl mx-auto px-6 pt-14 pb-6">
      {/* Section header */}
      <div className="text-center mb-12">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-3 font-medium inline-flex items-center justify-center gap-2 flex-wrap">
          <span>
            Weekly Showdown
            {weekLabel ? ` · Week of ${weekLabel}` : ""}
          </span>
          {fresh ? (
            <span
              className="inline-flex items-center rounded-full bg-gradient-to-r from-ketchup to-ketchup-light dark:from-mustard dark:to-mustard-light px-2.5 py-0.5 text-[10px] font-bold tracking-[0.2em] text-white dark:text-grill shadow-sm shadow-ketchup/20 dark:shadow-mustard/20"
              title="This week's print just dropped"
            >
              FRESH PRINT
            </span>
          ) : null}
        </p>
        <h2 className="font-headline text-3xl md:text-5xl text-gray-900 dark:text-white">
          {city1.city.name}{" "}
          <span className="text-gray-300 dark:text-gray-600 mx-3">vs</span>{" "}
          {city2.city.name}
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
          {tagline}
        </p>
      </div>

      {/* Cards */}
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        <BpiCard data={city1} isWinner={!isTie && bpi1 > bpi2} />

        {/* VS pill */}
        <div className="flex items-center justify-center lg:flex-col shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ketchup to-ketchup-light dark:from-mustard dark:to-mustard-light flex items-center justify-center text-white font-headline text-xl shadow-xl shadow-ketchup/25 dark:shadow-mustard/25">
            VS
          </div>
        </div>

        <BpiCard data={city2} isWinner={!isTie && bpi2 > bpi1} />
      </div>

      <ShareStrip
        shareUrl={shareUrl}
        caption={caption}
        label={
          fresh
            ? "Markets opened — share this week's print"
            : "Share this showdown"
        }
        emphasize={fresh}
      />
    </section>
  );
}
