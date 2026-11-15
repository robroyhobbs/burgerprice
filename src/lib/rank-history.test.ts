import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTapeWeek } from "./city-readout.ts";
import { buildRankHistoryLine, buildRankLadder } from "./rank-ladder.ts";
import type { BpiSnapshot, CityDashboardData } from "./types.ts";

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
    created_at: `${week.slice(0, 10)}T00:00:00.000Z`,
  };
}

/** Oldest-first history. current/previous are the latest pair in that history. */
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

const FOURTEEN = [
  "2026-01-05",
  "2026-01-12",
  "2026-01-19",
  "2026-01-26",
  "2026-02-02",
  "2026-02-09",
  "2026-02-16",
  "2026-02-23",
  "2026-03-02",
  "2026-03-09",
  "2026-03-16",
  "2026-03-23",
  "2026-03-30",
  "2026-04-06",
];

describe("buildRankHistoryLine", () => {
  it("counts a streak across calendar gaps and names both ends of a flat range", () => {
    // 2026-09-21 and 2026-10-05 are missing on purpose. They are not prints.
    const cities = board([
      {
        slug: "alpha",
        name: "Alpha",
        weeks: {
          "2026-09-07": 20,
          "2026-09-14": 21,
          "2026-09-28": 22,
          "2026-10-12": 23,
          "2026-10-19": 24,
        },
      },
      {
        slug: "beta",
        name: "Beta",
        weeks: {
          "2026-09-07": 10,
          "2026-09-14": 11,
          "2026-09-28": 12,
          "2026-10-12": 13,
          "2026-10-19": 14,
        },
      },
    ]);

    const line = buildRankHistoryLine(cities, "alpha");
    assert.equal(
      line,
      `Held #1 for 5 straight prints. Last 5 prints: best #1 (week of ${formatTapeWeek("2026-10-19")}), worst #1 (week of ${formatTapeWeek("2026-09-07")}).`,
    );
    assert.equal(line?.includes("Sep 21"), false);
    assert.equal(line?.includes("Oct 5"), false);
    assert.equal(buildRankLadder(cities, "alpha")?.rank, 1);
  });

  it("omits a one-print streak and cites the most recent best and worst", () => {
    const cities = board([
      {
        slug: "alpha",
        name: "Alpha",
        weeks: {
          "2026-07-06": 20, // #2
          "2026-07-13": 4, // #3, older worst
          "2026-07-20": 40, // #1, best
          "2026-07-27": 4, // #3, newer worst
          "2026-08-03": 15, // #2, current
        },
      },
      {
        slug: "top",
        name: "Top",
        weeks: {
          "2026-07-06": 30,
          "2026-07-13": 30,
          "2026-07-20": 30,
          "2026-07-27": 30,
          "2026-08-03": 30,
        },
      },
      {
        slug: "low",
        name: "Low",
        weeks: {
          "2026-07-06": 5,
          "2026-07-13": 5,
          "2026-07-20": 5,
          "2026-07-27": 5,
          "2026-08-03": 5,
        },
      },
    ]);

    assert.equal(buildRankLadder(cities, "alpha")?.rank, 2);
    assert.equal(
      buildRankHistoryLine(cities, "alpha"),
      `Last 5 prints: best #1 (week of ${formatTapeWeek("2026-07-20")}), worst #3 (week of ${formatTapeWeek("2026-07-27")}).`,
    );
  });

  it("keeps a two-print streak and skips the range", () => {
    const cities = board([
      { slug: "alpha", name: "Alpha", weeks: { "2026-11-02": 10, "2026-11-09": 11 } },
      { slug: "beta", name: "Beta", weeks: { "2026-11-02": 20, "2026-11-09": 21 } },
    ]);
    assert.equal(
      buildRankHistoryLine(cities, "alpha"),
      "Held #2 for 2 straight prints.",
    );
  });

  it("says nothing when the rank just changed and the tape is shorter than 3 prints", () => {
    const cities = board([
      { slug: "alpha", name: "Alpha", weeks: { "2026-11-02": 20, "2026-11-09": 10 } },
      { slug: "beta", name: "Beta", weeks: { "2026-11-02": 10, "2026-11-09": 20 } },
    ]);
    assert.equal(buildRankHistoryLine(cities, "alpha"), null);
    assert.equal(
      buildRankHistoryLine(
        board([{ slug: "alpha", name: "Alpha", weeks: { "2026-11-09": 10 } }]),
        "alpha",
      ),
      null,
    );
    assert.equal(buildRankHistoryLine(cities, "missing"), null);
  });

  it("limits the range to the last 12 prints and lets the streak run longer", () => {
    const alpha: Record<string, number> = {};
    const beta: Record<string, number> = {};
    for (const [i, week] of FOURTEEN.entries()) {
      // Oldest week alpha is #1. Every later week alpha is #2.
      alpha[week] = i === 0 ? 30 : 10;
      beta[week] = i === 0 ? 10 : 20;
    }
    const cities = board([
      { slug: "alpha", name: "Alpha", weeks: alpha },
      { slug: "beta", name: "Beta", weeks: beta },
    ]);

    assert.equal(
      buildRankHistoryLine(cities, "alpha"),
      `Held #2 for 13 straight prints. Last 12 prints: best #2 (week of ${formatTapeWeek("2026-04-06")}), worst #2 (week of ${formatTapeWeek("2026-01-19")}).`,
    );
  });

  it("ranks a short board among the cities that printed and does not say of N", () => {
    const cities = board([
      {
        slug: "alpha",
        name: "Alpha",
        weeks: { "2026-06-01": 10, "2026-06-08": 20, "2026-06-15": 20 },
      },
      {
        slug: "beta",
        name: "Beta",
        weeks: { "2026-06-01": 12, "2026-06-08": 11, "2026-06-15": 11 },
      },
      {
        slug: "gamma",
        name: "Gamma",
        weeks: { "2026-06-08": 9, "2026-06-15": 9 },
      },
    ]);

    const line = buildRankHistoryLine(cities, "alpha");
    assert.equal(
      line,
      `Held #1 for 2 straight prints. Last 3 prints: best #1 (week of ${formatTapeWeek("2026-06-15")}), worst #2 (week of ${formatTapeWeek("2026-06-01")}).`,
    );
    assert.equal(/\bof \d/.test(line ?? ""), false);
    // Gamma sat out Jun 1. That week is not a gamma print, and the streak still holds.
    assert.equal(
      buildRankHistoryLine(cities, "gamma"),
      "Held #3 for 2 straight prints.",
    );
  });

  it("breaks ties the same way as the live ladder", () => {
    const cities = board([
      {
        slug: "first",
        name: "First",
        weeks: { "2026-05-04": 10, "2026-05-11": 10, "2026-05-18": 10 },
      },
      {
        slug: "second",
        name: "Second",
        weeks: { "2026-05-04": 10, "2026-05-11": 10, "2026-05-18": 10 },
      },
    ]);
    assert.equal(buildRankLadder(cities, "second")?.rank, 2);
    assert.equal(
      buildRankHistoryLine(cities, "second"),
      `Held #2 for 3 straight prints. Last 3 prints: best #2 (week of ${formatTapeWeek("2026-05-18")}), worst #2 (week of ${formatTapeWeek("2026-05-04")}).`,
    );
  });

  it("treats a timestamped week_of as the same print as a date", () => {
    const cities = board([
      {
        slug: "alpha",
        name: "Alpha",
        weeks: { "2026-10-12T00:00:00.000Z": 10, "2026-10-19": 10 },
      },
      {
        slug: "beta",
        name: "Beta",
        weeks: { "2026-10-12": 12, "2026-10-19": 12 },
      },
    ]);
    assert.equal(
      buildRankHistoryLine(cities, "alpha"),
      "Held #2 for 2 straight prints.",
    );
  });

  it("reads history, not a decoy current snapshot", () => {
    const cities = board([
      {
        slug: "alpha",
        name: "Alpha",
        weeks: { "2026-08-03": 20, "2026-08-10": 21, "2026-08-17": 22 },
      },
      {
        slug: "beta",
        name: "Beta",
        weeks: { "2026-08-03": 10, "2026-08-10": 11, "2026-08-17": 12 },
      },
    ]);
    cities[0].currentSnapshot = snapshot("alpha", "2026-12-01", 1);
    assert.equal(buildRankLadder(cities, "alpha")?.rank, 2);
    assert.equal(
      buildRankHistoryLine(cities, "alpha"),
      `Held #1 for 3 straight prints. Last 3 prints: best #1 (week of ${formatTapeWeek("2026-08-17")}), worst #1 (week of ${formatTapeWeek("2026-08-03")}).`,
    );
    cities[0].history = [];
    assert.equal(buildRankHistoryLine(cities, "alpha"), null);
  });
});
