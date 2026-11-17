import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTapeWeek } from "./city-readout.ts";
import {
  buildBottomStreak,
  buildLongestStreak,
  buildRankHistoryLine,
  buildRankLadder,
} from "./rank-ladder.ts";
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
  it("counts a streak across calendar gaps and omits a flat range", () => {
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
    assert.equal(line, "Held #1 for 5 straight prints.");
    assert.equal(/Last \d+ prints/.test(line ?? ""), false);
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

  it("lets the streak run longer than a flat 12-print window", () => {
    const alpha: Record<string, number> = {};
    const beta: Record<string, number> = {};
    for (const [i, week] of FOURTEEN.entries()) {
      // Oldest week alpha is #1 and sits outside the 12-print window.
      // Every later week is #2, so the window is flat and the range is omitted.
      // Counting that oldest week would name a best of #1.
      alpha[week] = i === 0 ? 30 : 10;
      beta[week] = i === 0 ? 10 : 20;
    }
    const cities = board([
      { slug: "alpha", name: "Alpha", weeks: alpha },
      { slug: "beta", name: "Beta", weeks: beta },
    ]);

    assert.equal(
      buildRankHistoryLine(cities, "alpha"),
      "Held #2 for 13 straight prints.",
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
    const line = buildRankHistoryLine(cities, "second");
    assert.equal(line, "Held #2 for 3 straight prints.");
    assert.equal(/Last \d+ prints/.test(line ?? ""), false);
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
      "Held #1 for 3 straight prints.",
    );
    cities[0].history = [];
    assert.equal(buildRankHistoryLine(cities, "alpha"), null);
  });
});

describe("buildLongestStreak", () => {
  it("picks the longest streak and does not invent a gap week", () => {
    // 2026-09-21 is missing on purpose. It is not a print.
    const cities = board([
      {
        slug: "alpha",
        name: "Alpha",
        weeks: {
          "2026-09-07": 10, // #2
          "2026-09-14": 40, // #1
          "2026-09-28": 40,
          "2026-10-12": 40,
          "2026-10-19": 40,
        },
      },
      {
        slug: "beta",
        name: "Beta",
        weeks: {
          "2026-09-07": 30, // #1
          "2026-09-14": 20,
          "2026-09-28": 20,
          "2026-10-12": 20,
          "2026-10-19": 20,
        },
      },
      {
        slug: "gamma",
        name: "Gamma",
        weeks: {
          "2026-09-07": 5,
          "2026-09-14": 5,
          "2026-09-28": 5,
          "2026-10-12": 5,
          "2026-10-19": 5,
        },
      },
    ]);

    assert.deepEqual(buildLongestStreak(cities), {
      slug: "gamma",
      name: "Gamma",
      state: "XX",
      rank: 3,
      streak: 5,
    });
    assert.equal(
      buildRankHistoryLine(cities, "gamma"),
      "Held #3 for 5 straight prints.",
    );
    assert.equal(buildRankHistoryLine(cities, "gamma")?.includes("Sep 21"), false);
  });

  it("breaks equal streaks toward the higher-ranked city, not input order", () => {
    const cities = board([
      {
        slug: "gamma",
        name: "Gamma",
        weeks: { "2026-05-04": 5, "2026-05-11": 5, "2026-05-18": 5 },
      },
      {
        slug: "beta",
        name: "Beta",
        weeks: { "2026-05-04": 10, "2026-05-11": 10, "2026-05-18": 10 },
      },
      {
        slug: "alpha",
        name: "Alpha",
        weeks: { "2026-05-04": 20, "2026-05-11": 20, "2026-05-18": 20 },
      },
    ]);

    assert.deepEqual(buildLongestStreak(cities), {
      slug: "alpha",
      name: "Alpha",
      state: "XX",
      rank: 1,
      streak: 3,
    });
  });

  it("uses the live ladder's tie order when BPIs match", () => {
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
    assert.equal(buildLongestStreak(cities)?.slug, "first");
    assert.equal(buildLongestStreak(cities)?.rank, 1);
    assert.deepEqual(buildBottomStreak(cities), {
      slug: "second",
      name: "Second",
      state: "XX",
      rank: 2,
      streak: 3,
    });
  });

  it("returns null when no city has held its rank for 2 prints", () => {
    const swapped = board([
      { slug: "alpha", name: "Alpha", weeks: { "2026-11-02": 20, "2026-11-09": 10 } },
      { slug: "beta", name: "Beta", weeks: { "2026-11-02": 10, "2026-11-09": 20 } },
    ]);
    assert.equal(buildLongestStreak(swapped), null);
    assert.equal(buildBottomStreak(swapped), null);
    assert.equal(
      buildLongestStreak(
        board([{ slug: "alpha", name: "Alpha", weeks: { "2026-11-09": 10 } }]),
      ),
      null,
    );
    assert.equal(buildLongestStreak([]), null);
  });

  it("ignores a streak that stopped before the latest print", () => {
    const cities = board([
      {
        slug: "old",
        name: "Old",
        weeks: {
          "2026-01-05": 40,
          "2026-01-12": 40,
          "2026-01-19": 40,
          "2026-01-26": 40,
        },
      },
      {
        slug: "now",
        name: "Now",
        weeks: {
          "2026-01-05": 20,
          "2026-01-12": 20,
          "2026-01-19": 20,
          "2026-01-26": 20,
          "2026-02-02": 20,
        },
      },
      {
        slug: "cheap",
        name: "Cheap",
        weeks: {
          "2026-01-05": 5,
          "2026-01-12": 5,
          "2026-01-19": 5,
          "2026-01-26": 5,
          "2026-02-02": 5,
        },
      },
    ]);

    // Old's own page still cites the four-print reign. The board does not:
    // Old sat out the latest print, and the cities that did print just moved.
    assert.equal(
      buildRankHistoryLine(cities, "old"),
      "Held #1 for 4 straight prints.",
    );
    assert.equal(buildLongestStreak(cities), null);
    assert.equal(buildBottomStreak(cities), null);
  });

  it("names last place when that rank has been held, and skips a fresh bottom", () => {
    const held = board([
      {
        slug: "alpha",
        name: "Alpha",
        weeks: { "2026-04-06": 30, "2026-04-13": 30, "2026-04-20": 30 },
      },
      {
        slug: "beta",
        name: "Beta",
        weeks: { "2026-04-06": 20, "2026-04-13": 20, "2026-04-20": 20 },
      },
      {
        slug: "gamma",
        name: "Gamma",
        weeks: { "2026-04-06": 10, "2026-04-13": 10, "2026-04-20": 10 },
      },
    ]);
    assert.equal(buildLongestStreak(held)?.slug, "alpha");
    assert.deepEqual(buildBottomStreak(held), {
      slug: "gamma",
      name: "Gamma",
      state: "XX",
      rank: 3,
      streak: 3,
    });

    const freshBottom = board([
      {
        slug: "alpha",
        name: "Alpha",
        weeks: { "2026-04-06": 40, "2026-04-13": 40, "2026-04-20": 40 },
      },
      {
        slug: "beta",
        name: "Beta",
        weeks: { "2026-04-06": 20, "2026-04-13": 20, "2026-04-20": 10 },
      },
      {
        slug: "gamma",
        name: "Gamma",
        weeks: { "2026-04-06": 10, "2026-04-13": 10, "2026-04-20": 20 },
      },
    ]);
    assert.equal(buildLongestStreak(freshBottom)?.slug, "alpha");
    assert.equal(buildBottomStreak(freshBottom), null);
  });
});
