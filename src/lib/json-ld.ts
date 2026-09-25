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


export interface ShowdownFaqContext {
  weekOf: string | null;
  leftName: string;
  leftState: string;
  leftSlug: string;
  leftBpi: number | null;
  rightName: string;
  rightState: string;
  rightSlug: string;
  rightBpi: number | null;
  nationalAvg: number | null;
  cityCount: number;
  cheapestCity: string | null;
  mostExpensiveCity: string | null;
}

/**
 * Homepage showdown FAQ copy — on-page + FAQPage JSON-LD.
 * Voice: Bloomberg-meets-Wendy's. Mirrors /cities and city-detail FAQ patterns.
 */
export function buildShowdownFaqItems(ctx: ShowdownFaqContext): FaqItem[] {
  const items: FaqItem[] = [];
  const leftLabel = `${ctx.leftName}, ${ctx.leftState}`;
  const rightLabel = `${ctx.rightName}, ${ctx.rightState}`;
  const weekBit = ctx.weekOf ? ` for the week of ${ctx.weekOf}` : "";

  if (ctx.leftBpi != null && ctx.rightBpi != null) {
    const gap = Math.abs(ctx.leftBpi - ctx.rightBpi);
    let lead: string;
    if (gap < 0.01) {
      lead = `${ctx.leftName} and ${ctx.rightName} are locked at parity — markets hate a draw.`;
    } else {
      const leader = ctx.leftBpi > ctx.rightBpi ? ctx.leftName : ctx.rightName;
      const underdog = ctx.leftBpi > ctx.rightBpi ? ctx.rightName : ctx.leftName;
      lead = `${leader} leads by $${gap.toFixed(2)}. ${underdog} is the value trade this week.`;
    }
    items.push({
      q: "What is this week's city showdown?",
      a: `Head-to-head BPI${weekBit}: ${leftLabel} at $${ctx.leftBpi.toFixed(2)} vs ${rightLabel} at $${ctx.rightBpi.toFixed(2)}. ${lead}`,
    });
  } else {
    items.push({
      q: "What is this week's city showdown?",
      a: `Two tracked cities face off on BPI each week${weekBit ? weekBit : ""}. Once both prints clear, this section shows the dollars, the gap, and who leads.`,
    });
  }

  items.push({
    q: "How do I read the showdown?",
    a: "Higher BPI means a pricier burger tape that week — not a moral victory. The winner badge marks the higher print; the gap is just dollars between the two. Same weighting as every city page: Fast Food 20%, Casual/Diner 40%, Premium/Gourmet 40%. Not financial advice — just the tape.",
  });

  if (ctx.nationalAvg != null && ctx.leftBpi != null && ctx.rightBpi != null) {
    const vsLeft =
      Math.round(((ctx.leftBpi - ctx.nationalAvg) / ctx.nationalAvg) * 1000) / 10;
    const vsRight =
      Math.round(((ctx.rightBpi - ctx.nationalAvg) / ctx.nationalAvg) * 1000) / 10;
    const fmt = (d: number, name: string) =>
      d === 0
        ? `${name} dead even with national`
        : d > 0
          ? `${name} ${d.toFixed(1)}% above national`
          : `${name} ${Math.abs(d).toFixed(1)}% below national`;
    items.push({
      q: "How do these cities compare to the national print?",
      a: `National average sits at $${ctx.nationalAvg.toFixed(2)} across ${ctx.cityCount} tracked cities. ${fmt(vsLeft, ctx.leftName)}; ${fmt(vsRight, ctx.rightName)}.`,
    });
  } else if (ctx.nationalAvg != null) {
    items.push({
      q: "How do these cities compare to the national print?",
      a: `National average sits at $${ctx.nationalAvg.toFixed(2)} across ${ctx.cityCount} tracked cities. Open each city page for the full vs-national readout.`,
    });
  }

  items.push({
    q: "How are the matchup cities chosen?",
    a: "Deterministic weekly rotation — same week_of always picks the same pair from the tracked city list. Share URLs can pin an explicit pair (?showdown=slug-a,slug-b) without changing the live rotation.",
  });

  const floorCeil =
    ctx.cheapestCity && ctx.mostExpensiveCity
      ? ` This week the national floor is ${ctx.cheapestCity}; the ceiling is ${ctx.mostExpensiveCity}.`
      : "";
  items.push({
    q: "Where can I compare more cities?",
    a: `Browse the full card grid on /cities, dig into either matchup city above, or hit /rankings for the weekly leaderboard.${floorCeil} Methodology and weighting live on /about.`,
  });

  return items;
}


export interface HomePageJsonLdContext {
  weekOf: string | null;
  nationalAvg: number | null;
  cityCount: number;
}

/** Layout metadata title — keep in sync with src/app/layout.tsx */
const HOME_PAGE_NAME =
  "Burger Price Index | The Financial Index for Burger Lovers";

/** Layout metadata description — keep in sync with src/app/layout.tsx */
const HOME_PAGE_DESCRIPTION =
  "Track burger prices across US cities with the BPI. Weekly national index, city showdowns, market reports, and the Burger of the Week.";

/**
 * Homepage WebPage + optional national Dataset (mainEntity).
 * Mirrors city-detail WebPage/Dataset pattern; FAQPage stays separate.
 */
export function buildHomePageJsonLd(
  ctx: HomePageJsonLdContext,
): Record<string, unknown> {
  const base = getSiteBaseUrl();
  const url = `${base}/`;

  const webpage: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: HOME_PAGE_NAME,
    description: HOME_PAGE_DESCRIPTION,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: "Burger Price Index",
      url: base,
    },
  };

  if (ctx.weekOf) {
    webpage.dateModified = ctx.weekOf;
  }

  if (ctx.nationalAvg != null) {
    const print = `$${ctx.nationalAvg.toFixed(2)}`;
    const weekBit = ctx.weekOf ? ` for the week of ${ctx.weekOf}` : "";
    const dataset: Record<string, unknown> = {
      "@type": "Dataset",
      name: "Burger Price Index — National",
      description: `National Burger Price Index print of ${print}${weekBit} across ${ctx.cityCount} tracked US cities.`,
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
      variableMeasured: {
        "@type": "PropertyValue",
        name: "BPI score",
        value: Number(ctx.nationalAvg.toFixed(2)),
        unitText: "USD",
      },
    };

    if (ctx.weekOf) {
      dataset.dateModified = ctx.weekOf;
      dataset.temporalCoverage = ctx.weekOf;
    }

    webpage.mainEntity = dataset;
  }

  return webpage;
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
