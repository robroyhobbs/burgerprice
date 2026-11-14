import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRankMovements } from "./rank-ladder.ts";
import { buildShowdownCaption, showdownShareUrl } from "./share.ts";
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
  leftName: "Portland",
  leftBpi: 16.4,
  rightName: "Boston",
  rightBpi: 14,
  weekOf: "2026-11-09",
  leftSlug: "portland-or",
  rightSlug: "boston-ma",
} as const;

function plainCaption(fresh = false): string {
  const url = showdownShareUrl(BASE.leftSlug, BASE.rightSlug);
  const body = `Portland ($16.40) vs Boston ($14.00) — week of Nov 9, 2026. Portland leads by $2.40. Track it: ${url}`;
  return fresh ? `NEW · ${body}` : body;
}

describe("showdown share caption rank movement", () => {
  it("names each city's move versus the prior print", () => {
    const url = showdownShareUrl("portland-or", "boston-ma");
    assert.equal(
      buildShowdownCaption({
        ...BASE,
        leftRank: 7,
        leftPrevRank: 10,
        rightRank: 5,
        rightPrevRank: 3,
      }),
      `Portland ($16.40) vs Boston ($14.00) — week of Nov 9, 2026. Portland leads by $2.40. Ranks: Portland #7 (up 3), Boston #5 (down 2). Track it: ${url}`,
    );
    assert.match(
      buildShowdownCaption({
        ...BASE,
        leftRank: 6,
        leftPrevRank: 7,
        rightRank: 8,
        rightPrevRank: 7,
      }),
      /Ranks: Portland #6 \(up 1 spot\), Boston #8 \(down 1 spot\)\./,
    );
    assert.match(
      buildShowdownCaption({
        ...BASE,
        leftRank: 7,
        leftPrevRank: 7,
        rightRank: 5,
        rightPrevRank: 3,
      }),
      /Ranks: Portland #7 \(flat\), Boston #5 \(down 2\)\./,
    );
    assert.match(
      buildShowdownCaption({
        ...BASE,
        leftRank: 4,
        leftPrevRank: 4,
        rightRank: 2,
        rightPrevRank: 2,
      }),
      /Ranks: Portland #4 \(flat\), Boston #2 \(flat\)\./,
    );
  });

  it("omits a city's movement when there is no prior print, and the whole clause when there is no rank", () => {
    const plain = plainCaption();
    assert.equal(buildShowdownCaption(BASE), plain);
    assert.equal(
      buildShowdownCaption({ ...BASE, leftRank: null, rightRank: null }),
      plain,
    );
    assert.equal(
      buildShowdownCaption({
        ...BASE,
        leftRank: 0,
        rightRank: -1,
        leftPrevRank: 4,
        rightPrevRank: 2,
      }),
      plain,
    );
    assert.doesNotMatch(plain, /Ranks:/);

    assert.match(
      buildShowdownCaption({
        ...BASE,
        leftRank: 7,
        leftPrevRank: null,
        rightRank: 5,
        rightPrevRank: undefined,
      }),
      /Ranks: Portland #7, Boston #5\. Track it:/,
    );
    const noPrior = buildShowdownCaption({
      ...BASE,
      leftRank: 7,
      rightRank: 5,
    });
    assert.match(noPrior, /Ranks: Portland #7, Boston #5\./);
    assert.doesNotMatch(noPrior, /up |down |\(flat\)/);

    assert.match(
      buildShowdownCaption({
        ...BASE,
        leftRank: 7,
        leftPrevRank: 10,
      }),
      /Ranks: Portland #7 \(up 3\)\. Track it:/,
    );
    assert.doesNotMatch(
      buildShowdownCaption({ ...BASE, leftRank: 7, leftPrevRank: 10 }),
      /Boston #/,
    );

    assert.match(
      buildShowdownCaption({
        ...BASE,
        leftBpi: 14,
        rightBpi: 14,
        leftRank: 3,
        rightRank: 8,
        rightPrevRank: 8,
      }),
      /Locked at parity\. Ranks: Portland #3, Boston #8 \(flat\)\./,
    );
  });

  it("prefixes a fresh print and still prints the rank clause when it fits", () => {
    const fresh = buildShowdownCaption({
      ...BASE,
      fresh: true,
      leftRank: 7,
      leftPrevRank: 10,
      rightRank: 5,
      rightPrevRank: 3,
    });
    assert.equal(
      fresh,
      `NEW · ${plainCaption().replace(" Track it:", " Ranks: Portland #7 (up 3), Boston #5 (down 2). Track it:")}`,
    );
    assert.ok(xLength(fresh, showdownShareUrl(BASE.leftSlug, BASE.rightSlug)) <= 280);
    assert.equal(
      buildShowdownCaption({ ...BASE, fresh: true }),
      plainCaption(true),
    );
  });

  it("reads current and prior rank from the same board the city pages use", () => {
    const cities = board([
      {
        slug: "boston-ma",
        name: "Boston",
        weeks: { "2026-11-02": 50, "2026-11-09": 50 },
      },
      {
        slug: "alpha",
        name: "Alpha",
        weeks: { "2026-11-02": 40, "2026-11-09": 40 },
      },
      {
        slug: "gamma",
        name: "Gamma",
        weeks: { "2026-11-02": 30, "2026-11-09": 20 },
      },
      {
        slug: "portland-or",
        name: "Portland",
        weeks: { "2026-11-02": 10, "2026-11-09": 45 },
      },
    ]);
    const moves = buildRankMovements(cities);
    const portland = moves.get("portland-or");
    const boston = moves.get("boston-ma");
    const gamma = moves.get("gamma");
    assert.equal(portland?.rank, 2);
    assert.equal(portland?.prevRank, 4);
    assert.equal(boston?.rank, 1);
    assert.equal(boston?.prevRank, 1);
    assert.equal(gamma?.rank, 4);
    assert.equal(gamma?.prevRank, 3);

    assert.match(
      buildShowdownCaption({
        ...BASE,
        leftBpi: 45,
        rightBpi: 50,
        leftRank: portland!.rank,
        leftPrevRank: portland!.prevRank,
        rightRank: boston!.rank,
        rightPrevRank: boston!.prevRank,
      }),
      /Boston leads by \$5\.00\. Ranks: Portland #2 \(up 2\), Boston #1 \(flat\)\./,
    );
    assert.match(
      buildShowdownCaption({
        ...BASE,
        rightName: "Gamma",
        rightSlug: "gamma",
        leftBpi: 45,
        rightBpi: 20,
        leftRank: portland!.rank,
        leftPrevRank: portland!.prevRank,
        rightRank: gamma!.rank,
        rightPrevRank: gamma!.prevRank,
      }),
      /Ranks: Portland #2 \(up 2\), Gamma #4 \(down 1 spot\)\./,
    );

    const firstPrint = board([
      { slug: "portland-or", name: "Portland", weeks: { "2026-11-09": 12 } },
      { slug: "boston-ma", name: "Boston", weeks: { "2026-11-09": 20 } },
    ]);
    const first = buildRankMovements(firstPrint);
    assert.equal(first.get("portland-or")?.prevRank, null);
    assert.equal(first.get("boston-ma")?.rank, 1);
    const firstCaption = buildShowdownCaption({
      ...BASE,
      leftBpi: 12,
      rightBpi: 20,
      leftRank: first.get("portland-or")!.rank,
      leftPrevRank: first.get("portland-or")!.prevRank,
      rightRank: first.get("boston-ma")!.rank,
      rightPrevRank: first.get("boston-ma")!.prevRank,
    });
    assert.match(firstCaption, /Ranks: Portland #2, Boston #1\./);
    assert.doesNotMatch(firstCaption, /up |down |\(flat\)/);

    const uneven = board([
      {
        slug: "portland-or",
        name: "Portland",
        weeks: { "2026-11-02": 10, "2026-11-09": 30 },
      },
      { slug: "boston-ma", name: "Boston", weeks: { "2026-11-09": 20 } },
    ]);
    const unevenMoves = buildRankMovements(uneven);
    assert.equal(unevenMoves.get("portland-or")?.prevRank, null);
    assert.equal(unevenMoves.get("boston-ma")?.prevRank, null);
    const unevenCaption = buildShowdownCaption({
      ...BASE,
      leftRank: unevenMoves.get("portland-or")!.rank,
      leftPrevRank: unevenMoves.get("portland-or")!.prevRank,
      rightRank: unevenMoves.get("boston-ma")!.rank,
      rightPrevRank: unevenMoves.get("boston-ma")!.prevRank,
    });
    assert.match(unevenCaption, /Ranks: Portland #\d+, Boston #\d+\./);
    assert.doesNotMatch(unevenCaption, /up |down |\(flat\)/);
  });

  it("drops the rank clause when it would exceed 280, counting the URL as 23 and the fresh prefix", () => {
    const url = showdownShareUrl("portland-or", "boston-ma");
    // Boston is the leader, so lengthening the left name does not also
    // lengthen the "leads by" sentence.
    const priced = { ...BASE, leftBpi: 12.4, rightBpi: 14.8 };
    const sample = buildShowdownCaption({
      ...priced,
      leftName: "P",
      leftRank: 7,
      leftPrevRank: 10,
      rightRank: 5,
      rightPrevRank: 3,
    });
    const sampleLen = xLength(sample, url);
    assert.match(sample, /Ranks: P #7 \(up 3\), Boston #5 \(down 2\)\./);
    assert.ok(sampleLen < 250, `fixture caption already long: ${sampleLen}`);
    assert.equal(sample.length - sampleLen, url.length - 23);

    let best: { n: number; len: number } | null = null;
    for (let n = 1; n < 200; n++) {
      const caption = buildShowdownCaption({
        ...priced,
        leftName: "P".repeat(n),
        leftRank: 7,
        leftPrevRank: 10,
        rightRank: 5,
        rightPrevRank: 3,
      });
      const len = xLength(caption, url);
      if (!caption.includes("Ranks:")) break;
      assert.ok(len <= 280, `kept a clause over 280 (${len})`);
      best = { n, len };
    }
    assert.ok(best, "expected a name length that still fits the clause");

    // Rank digits appear only in the clause, so they close a 1- or 2-character
    // gap without the name step jumping over 280.
    const gap = 280 - best.len;
    const leftRank = 10 ** (String(7).length - 1 + gap);
    const kept = buildShowdownCaption({
      ...priced,
      leftName: "P".repeat(best.n),
      leftRank,
      leftPrevRank: leftRank + 3,
      rightRank: 5,
      rightPrevRank: 3,
    });
    assert.equal(xLength(kept, url), 280);
    assert.match(kept, new RegExp(`Ranks: ${"P".repeat(best.n)} #${leftRank} \\(up 3\\)`));
    assert.equal(kept.length - xLength(kept, url), url.length - 23);
    if (url.length > 23) {
      assert.ok(kept.length > 280);
    }

    const longName = `${"P".repeat(best.n)}Z`;
    const dropped = buildShowdownCaption({
      ...priced,
      leftName: longName,
      leftRank,
      leftPrevRank: leftRank + 3,
      rightRank: 5,
      rightPrevRank: 3,
    });
    const plain = buildShowdownCaption({ ...priced, leftName: longName });
    assert.equal(dropped, plain);
    assert.ok(xLength(dropped, url) <= 280);
    assert.doesNotMatch(dropped, /Ranks:/);

    const fresh = buildShowdownCaption({
      ...priced,
      leftName: "P".repeat(best.n),
      leftRank,
      leftPrevRank: leftRank + 3,
      rightRank: 5,
      rightPrevRank: 3,
      fresh: true,
    });
    const freshPlain = buildShowdownCaption({
      ...priced,
      leftName: "P".repeat(best.n),
      fresh: true,
    });
    assert.equal(fresh, freshPlain);
    assert.match(fresh, /^NEW · /);
    assert.doesNotMatch(fresh, /Ranks:/);
    assert.ok(xLength(fresh, url) <= 280);
  });
});
