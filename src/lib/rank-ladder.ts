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

export interface ShakeupMove {
  slug: string;
  name: string;
  state: string;
  rank: number;
  prevRank: number;
  spots: number;
}

export interface BoardShakeupData {
  prevWeekOf: string;
  climber: ShakeupMove | null;
  slider: ShakeupMove | null;
  held: number;
  total: number;
}

/**
 * Biggest rank climber and slider vs the prior available print, using the
 * same movement rules as the leaderboard arrows. Null when no comparison.
 */
export function buildBoardShakeup(
  cities: CityDashboardData[],
): BoardShakeupData | null {
  const moves = [...buildRankMovements(cities).values()].filter(
    (m) => m.delta != null && m.prevRank != null && m.prevWeekOf,
  );
  if (moves.length === 0) return null;
  const toMove = (m: (typeof moves)[number]): ShakeupMove | null => {
    const c = cities.find((x) => x.city.slug === m.slug);
    if (!c) return null;
    return {
      slug: m.slug,
      name: c.city.name,
      state: c.city.state,
      rank: m.rank,
      prevRank: m.prevRank as number,
      spots: Math.abs(m.delta as number),
    };
  };
  // Biggest move first; ties go to the higher-ranked (pricier) city.
  const up = moves
    .filter((m) => (m.delta as number) > 0)
    .sort((a, b) => (b.delta as number) - (a.delta as number) || a.rank - b.rank);
  const down = moves
    .filter((m) => (m.delta as number) < 0)
    .sort((a, b) => (a.delta as number) - (b.delta as number) || a.rank - b.rank);
  return {
    prevWeekOf: moves[0].prevWeekOf as string,
    climber: up.length > 0 ? toMove(up[0]) : null,
    slider: down.length > 0 ? toMove(down[0]) : null,
    held: moves.filter((m) => m.delta === 0).length,
    total: moves.length,
  };
}

function weekKey(weekOf: string | null | undefined): string {
  return String(weekOf ?? "").slice(0, 10);
}

/**
 * Replay one print. currentSnapshot is that week's snapshot; previousSnapshot
 * is the prior entry in history, so a missing week (the Oct 26 gap) is not
 * treated as the comparison. Cities with no snapshot that week drop off the board.
 */
function citiesAsOfPrint(
  cities: CityDashboardData[],
  weekOf: string,
): CityDashboardData[] {
  const week = weekKey(weekOf);
  return cities.map((c) => {
    const hist = [...(c.history ?? [])].sort((a, b) =>
      weekKey(a.week_of).localeCompare(weekKey(b.week_of)),
    );
    const idx = hist.findIndex((s) => weekKey(s.week_of) === week);
    if (idx === -1) {
      return { ...c, currentSnapshot: null, previousSnapshot: null };
    }
    return {
      ...c,
      currentSnapshot: hist[idx],
      previousSnapshot: idx > 0 ? hist[idx - 1] : null,
    };
  });
}

/**
 * Board shakeup for one edition week, vs that week's prior available print.
 * Same rules as buildBoardShakeup / buildRankMovements — history is replayed
 * so archived editions don't use the latest print.
 */
export function buildBoardShakeupForWeek(
  cities: CityDashboardData[],
  weekOf: string,
): BoardShakeupData | null {
  return buildBoardShakeup(citiesAsOfPrint(cities, weekOf));
}
