import type { CityDashboardData } from "@/lib/types";

export interface LadderCity {
  name: string;
  state: string;
  slug: string;
  bpi: number;
  rank: number;
}

export interface RankLadder {
  rank: number;
  total: number;
  bpi: number;
  weekOf: string | null;
  /** Next city up the board (pricier), null when this city is #1. */
  pricier: LadderCity | null;
  /** Next city down the board (cheaper), null when this city is last. */
  cheaper: LadderCity | null;
}

/**
 * Where a city sits on the BPI board, priciest first, using each city's
 * latest available print. Returns null when the city has no print yet.
 */
export function buildRankLadder(
  cities: CityDashboardData[],
  slug: string,
): RankLadder | null {
  const ranked = cities
    .filter((c) => c.currentSnapshot?.bpi_score != null)
    .sort(
      (a, b) =>
        (b.currentSnapshot!.bpi_score as number) -
        (a.currentSnapshot!.bpi_score as number),
    )
    .map(
      (c, i): LadderCity => ({
        name: c.city.name,
        state: c.city.state,
        slug: c.city.slug,
        bpi: c.currentSnapshot!.bpi_score as number,
        rank: i + 1,
      }),
    );

  const idx = ranked.findIndex((c) => c.slug === slug);
  if (idx === -1) return null;

  const self = cities.find((c) => c.city.slug === slug);
  return {
    rank: idx + 1,
    total: ranked.length,
    bpi: ranked[idx].bpi,
    weekOf: self?.currentSnapshot?.week_of ?? null,
    pricier: idx > 0 ? ranked[idx - 1] : null,
    cheaper: idx < ranked.length - 1 ? ranked[idx + 1] : null,
  };
}
