import type { CityDashboardData } from "./types";

const DEFAULT_BASE = "https://burgerprice.com";

export function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

/**
 * Build Schema.org JSON-LD for a city BPI profile page.
 * WebPage + about Place/City + mainEntity Dataset (factual fields only).
 * Dataset includes license (CC BY 4.0) for GSC / Schema.org Dataset guidance.
 */
export function buildCityPageJsonLd(data: CityDashboardData): Record<string, unknown> {
  const base = getSiteBaseUrl();
  const { city, currentSnapshot } = data;
  const url = `${base}/cities/${city.slug}`;
  const weekOf = currentSnapshot?.week_of ?? undefined;
  const bpi = currentSnapshot?.bpi_score;
  const change = currentSnapshot?.change_pct;

  const changeText =
    change == null
      ? ""
      : ` (${change > 0 ? "+" : ""}${change.toFixed(1)}% WoW)`;
  const name = `${city.name}, ${city.state} | Burger Price Index`;
  const description = `Burger Price Index for ${city.name}: ${
    bpi != null ? `$${bpi.toFixed(2)}${changeText}` : "collecting data"
  }. See restaurant prices, trends, and national comparison.`;

  const place: Record<string, unknown> = {
    "@type": "City",
    name: city.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: city.name,
      addressRegion: city.state,
      addressCountry: "US",
    },
  };

  if (city.lat != null && city.lng != null) {
    place.geo = {
      "@type": "GeoCoordinates",
      latitude: city.lat,
      longitude: city.lng,
    };
  }

  const dataset: Record<string, unknown> = {
    "@type": "Dataset",
    name: `Burger Price Index — ${city.name}, ${city.state}`,
    description,
    url,
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
    creator: {
      "@type": "Organization",
      name: "Burger Price Index",
      url: base,
    },
    publisher: {
      "@type": "Organization",
      name: "Burger Price Index",
      url: base,
    },
  };

  if (weekOf) {
    dataset.dateModified = weekOf;
    dataset.temporalCoverage = weekOf;
  }

  if (bpi != null) {
    dataset.variableMeasured = {
      "@type": "PropertyValue",
      name: "BPI score",
      value: Number(bpi.toFixed(2)),
      unitText: "USD",
    };
  }

  const webpage: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: "Burger Price Index",
      url: base,
    },
    about: place,
    mainEntity: dataset,
  };

  if (weekOf) {
    webpage.dateModified = weekOf;
  }

  return webpage;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface CityFaqContext {
  name: string;
  state: string;
  slug: string;
  bpi: number | null;
  changePct: number | null;
  weekOf: string | null;
  rank: number;
  totalCities: number;
  nationalAvg: number | null;
  cheapestRestaurant: string | null;
  cheapestPrice: number | null;
  mostExpensiveRestaurant: string | null;
  mostExpensivePrice: number | null;
  sampleSize: number | null;
  peerCities: { name: string; state: string; bpi: number }[];
}

/**
 * City-specific FAQ copy for /cities/[slug] — on-page + FAQPage JSON-LD.
 * Voice: Bloomberg-meets-Wendy's. Factual fields only when data exists.
 */
export function buildCityFaqItems(ctx: CityFaqContext): FaqItem[] {
  const label = `${ctx.name}, ${ctx.state}`;
  const items: FaqItem[] = [];

  if (ctx.bpi != null && ctx.weekOf) {
    const wow =
      ctx.changePct == null
        ? "Flat vs last week — or first print."
        : ctx.changePct === 0
          ? "Flat week-over-week."
          : `${ctx.changePct > 0 ? "+" : ""}${ctx.changePct.toFixed(1)}% week-over-week.`;
    items.push({
      q: `What is ${ctx.name}'s Burger Price Index this week?`,
      a: `${label} prints at $${ctx.bpi.toFixed(2)} for the week of ${ctx.weekOf}. ${wow} That's the weighted tape across fast-food, casual, and premium burgers sampled in ${ctx.name}.`,
    });
  } else {
    items.push({
      q: `What is ${ctx.name}'s Burger Price Index this week?`,
      a: `We're still collecting ${ctx.name}'s print. Once the weekly run clears, this page shows BPI dollars, WoW change, and the restaurant tape.`,
    });
  }

  if (ctx.bpi != null && ctx.nationalAvg != null && ctx.rank > 0) {
    const diff =
      Math.round(((ctx.bpi - ctx.nationalAvg) / ctx.nationalAvg) * 1000) / 10;
    const vs =
      diff === 0
        ? "dead even with"
        : diff > 0
          ? `${diff.toFixed(1)}% above`
          : `${Math.abs(diff).toFixed(1)}% below`;
    items.push({
      q: `How does ${ctx.name} compare to the national average?`,
      a: `${ctx.name} sits ${vs} the national print of $${ctx.nationalAvg.toFixed(2)} — rank #${ctx.rank} of ${ctx.totalCities} tracked cities (highest BPI first).`,
    });
  }

  if (
    ctx.cheapestRestaurant &&
    ctx.cheapestPrice != null &&
    ctx.mostExpensiveRestaurant &&
    ctx.mostExpensivePrice != null
  ) {
    const sample =
      ctx.sampleSize != null && ctx.sampleSize > 0
        ? ` Sample this week: ${ctx.sampleSize} burgers.`
        : "";
    items.push({
      q: `What's the cheapest and most expensive burger in ${ctx.name}?`,
      a: `Floor: ${ctx.cheapestRestaurant} at $${ctx.cheapestPrice.toFixed(2)}. Ceiling: ${ctx.mostExpensiveRestaurant} at $${ctx.mostExpensivePrice.toFixed(2)}.${sample} Full tape is on this page.`,
    });
  }

  items.push({
    q: `How do I read ${ctx.name}'s BPI?`,
    a: "BPI is a weighted average — Fast Food 20%, Casual/Diner 40%, Premium/Gourmet 40%. Same recipe every city, every week. The big number is the print; WoW % is the move; the chart and price table fill in the story. Not financial advice — just the tape.",
  });

  if (ctx.peerCities.length > 0) {
    const peers = ctx.peerCities
      .map((p) => `${p.name}, ${p.state} ($${p.bpi.toFixed(2)})`)
      .join("; ");
    items.push({
      q: `Which cities print closest to ${ctx.name}?`,
      a: `Closest peers on BPI this week: ${peers}. Browse the full grid on /cities or the weekly table on /rankings.`,
    });
  } else {
    items.push({
      q: `Where can I compare ${ctx.name} to other cities?`,
      a: "Hit /cities for the card grid with search and Near Me, or /rankings for the weekly leaderboard. Methodology and weighting live on /about.",
    });
  }

  return items;
}

export function buildFaqPageJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
