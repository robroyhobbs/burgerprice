import type { CityDashboardData } from "./types";

const DEFAULT_BASE = "https://burgerprice.com";

export function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

/**
 * Build Schema.org JSON-LD for a city BPI profile page.
 * WebPage + about Place/City + mainEntity Dataset (factual fields only).
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
