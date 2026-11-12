import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBoardShakeup, buildBoardShakeupForWeek } from "./rank-ladder.ts";
import {
  buildNationalCaption,
  buildRankingsCaption,
  nationalShareUrl,
  rankingsShareUrl,
  newsletterRankShareClause,
} from "./share.ts";
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
  weekOf: "2026-11-09",
  avgBpi: 15.07,
  changePct: 1.2,
  cityCount: 10,
  cheapestCity: "Austin",
  mostExpensiveCity: "New York",
} as const;

function plainCaption(): string {
  return `National BPI: $15.07 (+1.2% WoW) — week of Nov 9, 2026. Austin is the value trade; New York prints the premium. Avg across 10 cities. Bloomberg Terminal energy, Wendy's drive-thru prices — ${nationalShareUrl()}`;
}

describe("national share caption", { concurrency: false }, () => {
  it("names the biggest climber and slide in one clause", () => {
    const caption = buildNationalCaption({
      ...BASE,
      rankLine: "New Orleans climbed 2 to #7 and Portland slid 3 to #10.",
    });
    assert.equal(
      caption,
      `National BPI: $15.07 (+1.2% WoW) — week of Nov 9, 2026. Austin is the value trade; New York prints the premium. Avg across 10 cities. New Orleans climbed 2 to #7 and Portland slid 3 to #10. Bloomberg Terminal energy, Wendy's drive-thru prices — ${nationalShareUrl()}`,
    );
  });

  it("leaves the print line alone when there is no clause", () => {
    const plain = plainCaption();
    assert.equal(buildNationalCaption(BASE), plain);
    assert.equal(buildNationalCaption({ ...BASE, rankLine: null }), plain);
    assert.equal(buildNationalCaption({ ...BASE, rankLine: "   " }), plain);
    assert.equal(buildNationalCaption({ ...BASE, rankLine: "." }), plain);
  });

  it("drops the clause when it would exceed 280, counting the URL as 23", () => {
    const url = nationalShareUrl();
    const plain = plainCaption();
    const plainWeighted = xLength(plain, url);
    assert.ok(plainWeighted < 250, `fixture caption already long: ${plainWeighted}`);
    assert.equal(plain.length - plainWeighted, url.length - 23);

    const fitRank = "Q".repeat(280 - plainWeighted - 2);
    const kept = buildNationalCaption({ ...BASE, rankLine: fitRank });
    assert.equal(xLength(kept, url), 280);
    assert.ok(kept.includes(` ${fitRank}. `));
    // Raw length and the weighted length differ by exactly (url length − 23),
    // so a check against string length would keep or drop the wrong caption.
    assert.equal(kept.length - xLength(kept, url), url.length - 23);
    if (url.length > 23) {
      assert.ok(kept.length > 280);
    }

    const dropped = buildNationalCaption({ ...BASE, rankLine: `${fitRank}Z` });
    assert.equal(dropped, plain);
    if (url.length < 23) {
      const wouldBe = `${plain.slice(0, plain.lastIndexOf(" Bloomberg"))} ${fitRank}Z.${plain.slice(plain.lastIndexOf(" Bloomberg"))}`;
      assert.ok(wouldBe.length <= 280);
    }
  });

  it("builds the clause from the prior available print and stays quiet otherwise", () => {
    const moved = board([
      {
        slug: "alpha",
        name: "Alpha",
        weeks: { "2026-10-19": 30, "2026-11-02": 10, "2026-11-09": 30 },
      },
      {
        slug: "beta",
        name: "Beta",
        weeks: { "2026-10-19": 20, "2026-11-02": 20, "2026-11-09": 20 },
      },
      {
        slug: "gamma",
        name: "Gamma",
        weeks: { "2026-10-19": 10, "2026-11-02": 30, "2026-11-09": 10 },
      },
    ]);

    const weekClause = (cities: CityDashboardData[], weekOf: string) =>
      newsletterRankShareClause(buildBoardShakeupForWeek(cities, weekOf));

    // Oct 26 is a gap. Nov 2 compares to Oct 19, not to the later decoy print.
    assert.equal(
      weekClause(moved, "2026-11-02"),
      "Gamma climbed 2 to #1 and Alpha slid 2 to #3.",
    );
    const nov2 = buildNationalCaption({
      ...BASE,
      weekOf: "2026-11-02",
      rankLine: weekClause(moved, "2026-11-02"),
    });
    assert.ok(
      nov2.includes(
        "week of Nov 2, 2026. Austin is the value trade; New York prints the premium. Avg across 10 cities. Gamma climbed 2 to #1 and Alpha slid 2 to #3.",
      ),
    );
    assert.equal(weekClause(moved, "2026-10-26"), null);

    const oneSpot = board([
      { slug: "alpha", name: "Alpha", weeks: { "2026-11-02": 20, "2026-11-09": 10 } },
      { slug: "beta", name: "Beta", weeks: { "2026-11-02": 10, "2026-11-09": 20 } },
    ]);
    assert.equal(
      weekClause(oneSpot, "2026-11-09"),
      "Beta climbed 1 spot to #1 and Alpha slid 1 spot to #2.",
    );
    assert.equal(
      newsletterRankShareClause(buildBoardShakeup(oneSpot)),
      "Beta climbed 1 spot to #1 and Alpha slid 1 spot to #2.",
    );

    const flat = board([
      { slug: "alpha", name: "Alpha", weeks: { "2026-11-02": 20, "2026-11-09": 20 } },
      { slug: "beta", name: "Beta", weeks: { "2026-11-02": 10, "2026-11-09": 10 } },
    ]);
    assert.equal(weekClause(flat, "2026-11-09"), null);
    assert.equal(
      buildNationalCaption({ ...BASE, rankLine: weekClause(flat, "2026-11-09") }),
      plainCaption(),
    );

    const firstPrint = board([
      { slug: "alpha", name: "Alpha", weeks: { "2026-11-09": 20 } },
      { slug: "beta", name: "Beta", weeks: { "2026-11-09": 10 } },
    ]);
    assert.equal(buildBoardShakeupForWeek(firstPrint, "2026-11-09"), null);
    assert.equal(buildBoardShakeup(firstPrint), null);
    assert.equal(
      buildNationalCaption({
        ...BASE,
        rankLine: weekClause(firstPrint, "2026-11-09"),
      }),
      plainCaption(),
    );

    const uneven = board([
      { slug: "alpha", name: "Alpha", weeks: { "2026-11-02": 20, "2026-11-09": 10 } },
      { slug: "beta", name: "Beta", weeks: { "2026-11-09": 20 } },
    ]);
    assert.equal(weekClause(uneven, "2026-11-09"), null);
  });
});

describe("buildRankingsCaption rank line", () => {
  const base = {
    weekOf: "2026-11-09",
    avgBpi: 14.81,
    changePct: 1.2,
    cityCount: 10,
    topCity: "New York",
    topBpi: 21.04,
    valueCity: "Austin",
    valueBpi: 9.61,
  };

  it("adds the climber/slide clause before the coverage line", () => {
    const caption = buildRankingsCaption({
      ...base,
      rankLine: "Portland climbed 3 to #7 and Boston slid 2 to #5.",
    });
    assert.match(
      caption,
      /Austin is the value trade at \$9\.61\. Portland climbed 3 to #7 and Boston slid 2 to #5\. 10 cities on the tape\./,
    );
    assert.ok(caption.endsWith(rankingsShareUrl()));
  });

  it("stays the plain board line when there is no movement", () => {
    const plain = buildRankingsCaption(base);
    assert.equal(buildRankingsCaption({ ...base, rankLine: null }), plain);
    assert.equal(buildRankingsCaption({ ...base, rankLine: "  " }), plain);
    assert.doesNotMatch(plain, /climbed|slid/);
  });

  it("drops the clause rather than exceed X's 280 limit", () => {
    const long = `${"Very Long City Name ".repeat(12)}climbed 9 to #1.`;
    const caption = buildRankingsCaption({ ...base, rankLine: long });
    assert.equal(caption, buildRankingsCaption(base));
    assert.ok(xLength(caption, rankingsShareUrl()) <= 280);
  });
});
