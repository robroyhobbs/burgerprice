import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRankLadder } from "./rank-ladder.ts";
import { buildCityCaption, cityShareUrl } from "./share.ts";
import type { BpiSnapshot, CityDashboardData } from "./types.ts";

/**
 * X counts every URL as 23 characters. Independent of xPostLength so a
 * raw-length check cannot satisfy these tests when the URL is not 23 chars.
 */
function xLength(text: string, url: string): number {
  const parts = text.split(url);
  return parts.reduce((sum, part) => sum + part.length, 0) + (parts.length - 1) * 23;
}

function snapshot(slug: string, week: string, bpi: number): BpiSnapshot {
  return {
    id: `${slug}-${week}`,
    city_id: slug,
    week_of: week,
    bpi_score: bpi,
    change_pct: null,
    cheapest_price: 1,
    cheapest_restaurant: "Low",
    most_expensive_price: 2,
    most_expensive_restaurant: "High",
    avg_price: bpi,
    sample_size: 4,
    raw_prices: [],
    created_at: `${week}T00:00:00.000Z`,
  };
}

/** History is oldest-first, matching the dashboard query. */
function board(
  rows: { slug: string; name: string; weeks: Record<string, number> }[],
): CityDashboardData[] {
  return rows.map((row) => {
    const history = Object.keys(row.weeks)
      .sort()
      .map((week) => snapshot(row.slug, week, row.weeks[week]));
    return {
      city: {
        id: row.slug,
        name: row.name,
        state: "XX",
        slug: row.slug,
        lat: null,
        lng: null,
      },
      currentSnapshot: history[history.length - 1] ?? null,
      previousSnapshot: history.length >= 2 ? history[history.length - 2] : null,
      spotlight: null,
      history,
    };
  });
}

const BASE = {
  name: "Portland",
  state: "OR",
  slug: "portland",
  bpi: 12.4,
  changePct: 1.2,
  rank: 7,
  totalCities: 10,
  nationalAvg: 14.8,
} as const;

function plainCaption(): string {
  return `Portland, OR BPI: $12.40 (+1.2% WoW) — ranks #7 of 10; national prints $14.80. Bloomberg Terminal energy, Wendy's drive-thru prices — ${cityShareUrl("portland")}`;
}

describe("city share caption rank movement", () => {
  it("says how far the city moved versus the prior print", () => {
    const url = cityShareUrl("portland");
    assert.equal(
      buildCityCaption({ ...BASE, prevRank: 10 }),
      `Portland, OR BPI: $12.40 (+1.2% WoW) — ranks #7 of 10, up 3 from #10; national prints $14.80. Bloomberg Terminal energy, Wendy's drive-thru prices — ${url}`,
    );
    assert.match(
      buildCityCaption({ ...BASE, rank: 5, prevRank: 3 }),
      /ranks #5 of 10, down 2 from #3; national prints \$14\.80\./,
    );
    assert.match(
      buildCityCaption({ ...BASE, rank: 6, prevRank: 7 }),
      /ranks #6 of 10, up 1 spot from #7;/,
    );
    assert.match(
      buildCityCaption({ ...BASE, rank: 8, prevRank: 7 }),
      /ranks #8 of 10, down 1 spot from #7;/,
    );
  });

  it("stays the plain print when rank held, prior is missing, or prior rank is unknown", () => {
    const plain = plainCaption();
    assert.equal(buildCityCaption(BASE), plain);
    assert.equal(buildCityCaption({ ...BASE, prevRank: 7 }), plain);
    assert.equal(buildCityCaption({ ...BASE, prevRank: null }), plain);
    assert.equal(buildCityCaption({ ...BASE, prevRank: undefined }), plain);
    assert.equal(buildCityCaption({ ...BASE, rank: null, prevRank: 4 }), buildCityCaption({ ...BASE, rank: null }));
    assert.doesNotMatch(plain, /up |down /);
  });

  it("reads prior rank from the rank ladder, including a skipped week", () => {
    // Oct 26 is a gap and is absent. Oct 19 is an older decoy print: Portland
    // was #1 then, and #4 on Nov 2. The latest caption has to use Nov 2.
    const cities = board([
      {
        slug: "alpha",
        name: "Alpha",
        weeks: { "2026-10-19": 40, "2026-11-02": 40, "2026-11-09": 40 },
      },
      {
        slug: "beta",
        name: "Beta",
        weeks: { "2026-10-19": 30, "2026-11-02": 30, "2026-11-09": 30 },
      },
      {
        slug: "gamma",
        name: "Gamma",
        weeks: { "2026-10-19": 20, "2026-11-02": 25, "2026-11-09": 20 },
      },
      {
        slug: "portland",
        name: "Portland",
        weeks: { "2026-10-19": 50, "2026-11-02": 10, "2026-11-09": 35 },
      },
    ]);

    const portland = buildRankLadder(cities, "portland");
    assert.equal(portland?.rank, 2);
    assert.equal(portland?.prevRank, 4);
    assert.equal(portland?.prevWeekOf?.slice(0, 10), "2026-11-02");
    assert.match(
      buildCityCaption({
        ...BASE,
        bpi: 35,
        rank: portland!.rank,
        totalCities: portland!.total,
        prevRank: portland!.prevRank,
      }),
      /ranks #2 of 4, up 2 from #4;/,
    );

    const held = buildRankLadder(cities, "alpha");
    assert.equal(held?.prevRank, held?.rank);
    assert.equal(
      buildCityCaption({
        name: "Alpha",
        state: "XX",
        slug: "alpha",
        bpi: 40,
        changePct: 0,
        rank: held!.rank,
        totalCities: held!.total,
        prevRank: held!.prevRank,
      }),
      buildCityCaption({
        name: "Alpha",
        state: "XX",
        slug: "alpha",
        bpi: 40,
        changePct: 0,
        rank: held!.rank,
        totalCities: held!.total,
      }),
    );

    const gamma = buildRankLadder(cities, "gamma");
    assert.equal(gamma?.rank, 4);
    assert.equal(gamma?.prevRank, 3);
    assert.match(
      buildCityCaption({
        name: "Gamma",
        state: "XX",
        slug: "gamma",
        bpi: 20,
        changePct: -1,
        rank: gamma!.rank,
        totalCities: gamma!.total,
        prevRank: gamma!.prevRank,
      }),
      /ranks #4 of 4, down 1 spot from #3\./,
    );

    const firstPrint = board([
      { slug: "portland", name: "Portland", weeks: { "2026-11-09": 12 } },
      { slug: "alpha", name: "Alpha", weeks: { "2026-11-09": 20 } },
    ]);
    const first = buildRankLadder(firstPrint, "portland");
    assert.equal(first?.prevRank, null);
    assert.equal(
      buildCityCaption({
        ...BASE,
        rank: first!.rank,
        totalCities: first!.total,
        prevRank: first!.prevRank,
      }),
      buildCityCaption({
        ...BASE,
        rank: first!.rank,
        totalCities: first!.total,
      }),
    );

    const uneven = board([
      { slug: "portland", name: "Portland", weeks: { "2026-11-02": 10, "2026-11-09": 30 } },
      { slug: "alpha", name: "Alpha", weeks: { "2026-11-09": 20 } },
    ]);
    assert.equal(buildRankLadder(uneven, "portland")?.prevRank, null);
  });

  it("drops the movement clause when it would exceed 280, counting the URL as 23", () => {
    const url = cityShareUrl("portland");
    const move = ", up 3 from #10";
    const sample = buildCityCaption({ ...BASE, name: "P" });
    const sampleLen = xLength(sample, url);
    assert.ok(sampleLen < 250, `fixture caption already long: ${sampleLen}`);
    assert.equal(sample.length - sampleLen, url.length - 23);

    const nameLen = 280 - move.length - sampleLen + 1;
    assert.ok(nameLen > 1);
    const name = "P".repeat(nameLen);
    const kept = buildCityCaption({ ...BASE, name, prevRank: 10 });
    assert.equal(xLength(kept, url), 280);
    assert.match(kept, /, up 3 from #10;/);
    assert.equal(kept.length - xLength(kept, url), url.length - 23);
    if (url.length > 23) {
      assert.ok(kept.length > 280);
    }

    const longName = `${name}Z`;
    const dropped = buildCityCaption({ ...BASE, name: longName, prevRank: 10 });
    const plain = buildCityCaption({ ...BASE, name: longName });
    assert.equal(dropped, plain);
    assert.equal(xLength(dropped, url), 281 - move.length);
    assert.ok(xLength(dropped, url) <= 280);
    assert.doesNotMatch(dropped, /from #/);
  });
});
