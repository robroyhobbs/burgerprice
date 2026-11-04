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
  /** Rank on the prior print's board, null when there is no comparable prior print. */
  prevRank: number | null;
  /** Prior board size used for prevRank. */
  prevTotal: number | null;
  /** Week of the prior print used for the comparison. */
  prevWeekOf: string | null;
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

  // Prior board: rank every city that has a prior print, priciest first.
  const prior = cities
    .filter((c) => c.previousSnapshot?.bpi_score != null)
    .sort(
      (a, b) =>
        (b.previousSnapshot!.bpi_score as number) -
        (a.previousSnapshot!.bpi_score as number),
    );
  const prevIdx = prior.findIndex((c) => c.city.slug === slug);
  const hasPrev = prevIdx !== -1 && prior.length === ranked.length;

  return {
    prevRank: hasPrev ? prevIdx + 1 : null,
    prevTotal: hasPrev ? prior.length : null,
    prevWeekOf: hasPrev ? (self?.previousSnapshot?.week_of ?? null) : null,
    rank: idx + 1,
    total: ranked.length,
    bpi: ranked[idx].bpi,
    weekOf: self?.currentSnapshot?.week_of ?? null,
    pricier: idx > 0 ? ranked[idx - 1] : null,
    cheaper: idx < ranked.length - 1 ? ranked[idx + 1] : null,
  };
}

export interface RankMove {
  slug: string;
  /** Current rank on the board (1 = priciest). */
  rank: number;
  /** Rank on the prior print's board, null when no comparable prior print. */
  prevRank: number | null;
  /** Spots moved up the board (pricier) when positive, down when negative; null when unknown. */
  delta: number | null;
  /** Week of the prior print the comparison uses. */
  prevWeekOf: string | null;
}

/**
 * Board movement for every ranked city, built on buildRankLadder so the
 * rules (actual prior available print, no comparison unless the prior board
 * covers the same number of cities) match the city pages exactly.
 */
export function buildRankMovements(
  cities: CityDashboardData[],
): Map<string, RankMove> {
  const moves = new Map<string, RankMove>();
  for (const c of cities) {
    const ladder = buildRankLadder(cities, c.city.slug);
    if (!ladder) continue;
    moves.set(c.city.slug, {
      slug: c.city.slug,
      rank: ladder.rank,
      prevRank: ladder.prevRank,
      delta: ladder.prevRank == null ? null : ladder.prevRank - ladder.rank,
      prevWeekOf: ladder.prevWeekOf,
    });
  }
  return moves;
}
