import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";
import type { SnapshotLike } from "./city-readout.ts";
import type { BpiSnapshot, CityDashboardData } from "./types.ts";

register(new URL("./ts-resolve-hook.mjs", import.meta.url));

const {
  formatAllTimeRange,
  formatCityLlmsLine,
  formatNationalBpiLine,
  ranksPriciestFirst,
  recordDirectionsBySlug,
} = await import("./llms-txt.ts");

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function weekly(scores: number[], start = "2026-11-02"): SnapshotLike[] {
  return scores.map((bpi, i) => ({
    week_of: addDays(start, i * 7),
    bpi_score: bpi,
    change_pct: null,
  }));
}

function snapshot(
  week: string,
  bpi: number,
  change: number | null = null,
): LlmsSnap {
  return {
    week_of: week,
    bpi_score: bpi,
    change_pct: change,
    cheapest_price: 5.89,
    cheapest_restaurant: "McDonald's",
    most_expensive_price: 24,
    most_expensive_restaurant: "Portland City Grill",
    sample_size: 13,
  };
}

interface LlmsSnap {
  week_of: string;
  bpi_score: number;
  change_pct: number | null;
  cheapest_price: number;
  cheapest_restaurant: string;
  most_expensive_price: number;
  most_expensive_restaurant: string;
  sample_size: number;
}

function boardCity(
  slug: string,
  name: string,
  bpi: number | null,
): CityDashboardData {
  const current: BpiSnapshot | null =
    bpi == null
      ? null
      : {
          id: slug,
          city_id: slug,
          week_of: "2026-11-16",
          bpi_score: bpi,
          change_pct: null,
          cheapest_price: 1,
          cheapest_restaurant: "Low",
          most_expensive_price: 2,
          most_expensive_restaurant: "High",
          avg_price: bpi,
          sample_size: 4,
          raw_prices: [],
          created_at: "2026-11-16T00:00:00.000Z",
        };
  return {
    city: { id: slug, name, state: "XX", slug, lat: null, lng: null },
    currentSnapshot: current,
    previousSnapshot: null,
    spotlight: null,
    history: current ? [current] : [],
  };
}

const CITY_URL = "https://burgerprice.com/cities/portland";
const CSV = "https://burgerprice.com/data/bpi.csv?city=portland";

describe("formatNationalBpiLine", () => {
  const history = [
    { week_of: "2026-11-09", avg_bpi: 14.75 },
    { week_of: "2026-11-16", avg_bpi: 15.01 },
  ];
  const cities = [
    {
      name: "New York",
      state: "NY",
      slug: "new-york",
      bpi: 19.81,
      weekOf: "2026-11-16",
    },
    {
      name: "Austin",
      state: "TX",
      slug: "austin",
      bpi: 11.46,
      weekOf: "2026-11-16",
    },
    {
      name: "Ghost",
      state: "ZZ",
      slug: "ghost",
      bpi: 1,
      weekOf: "2026-11-09",
    },
  ];

  it("uses the latest national average, homepage WoW, and this week's cities", () => {
    assert.equal(
      formatNationalBpiLine(history, cities),
      "National BPI: $15.01 for the week of 2026-11-16 (+1.8% week over week). Cheapest city this week: Austin, TX. Priciest city this week: New York, NY.",
    );
  });

  it("reads an unsorted history and a timestamped week", () => {
    assert.equal(
      formatNationalBpiLine(
        [
          { week_of: "2026-11-16T00:00:00.000Z", avg_bpi: 15.01 },
          { week_of: "2026-11-09", avg_bpi: 14.75 },
        ],
        cities,
      ),
      formatNationalBpiLine(history, cities),
    );
  });

  it("omits WoW when there is no prior week and collapses a one-city board", () => {
    assert.equal(
      formatNationalBpiLine([{ week_of: "2026-11-16", avg_bpi: 11.46 }], [
        {
          name: "Austin",
          state: "TX",
          slug: "austin",
          bpi: 11.46,
          weekOf: "2026-11-16",
        },
      ]),
      "National BPI: $11.46 for the week of 2026-11-16. Cheapest and priciest city this week: Austin, TX.",
    );
  });

  it("omits city names when nobody printed the national week", () => {
    assert.equal(
      formatNationalBpiLine(history, [
        {
          name: "Austin",
          state: "TX",
          slug: "austin",
          bpi: 11.46,
          weekOf: "2026-10-05",
        },
      ]),
      "National BPI: $15.01 for the week of 2026-11-16 (+1.8% week over week).",
    );
  });

  it("signs a down week and drops the line when history is empty", () => {
    assert.match(
      formatNationalBpiLine(
        [
          { week_of: "2026-11-09", avg_bpi: 15.01 },
          { week_of: "2026-11-16", avg_bpi: 14.75 },
        ],
        [],
      ) ?? "",
      /National BPI: \$14\.75 for the week of 2026-11-16 \(-1\.7% week over week\)\.$/,
    );
    assert.equal(formatNationalBpiLine([], cities), null);
    assert.equal(
      formatNationalBpiLine([{ week_of: "not-a-week", avg_bpi: 15 }], cities),
      null,
    );
  });
});

describe("formatAllTimeRange", () => {
  it("prints low then high with ISO weeks and the print count", () => {
    assert.equal(
      formatAllTimeRange([
        { week_of: "2026-11-02T00:00:00.000Z", bpi_score: 10.77, change_pct: null },
        { week_of: "2026-11-09", bpi_score: 13.1, change_pct: null },
        { week_of: "2026-11-16", bpi_score: 14.58, change_pct: null },
      ]),
      "all-time range $10.77 (week of 2026-11-02) to $14.58 (week of 2026-11-16) across 3 prints",
    );
  });

  it("counts every tracked print, including a 44-print and a 46-print tape", () => {
    const portland = weekly(Array.from({ length: 44 }, () => 12.5), "2025-12-22");
    portland[20] = { week_of: portland[20].week_of, bpi_score: 10.77, change_pct: null };
    portland[43] = { week_of: portland[43].week_of, bpi_score: 14.58, change_pct: null };
    assert.equal(
      formatAllTimeRange(portland),
      `all-time range $10.77 (week of ${portland[20].week_of}) to $14.58 (week of ${portland[43].week_of}) across 44 prints`,
    );

    const newYork = weekly(Array.from({ length: 46 }, () => 20), "2025-12-22");
    newYork[5] = { week_of: newYork[5].week_of, bpi_score: 22.28, change_pct: null };
    newYork[7] = { week_of: newYork[7].week_of, bpi_score: 18.47, change_pct: null };
    assert.match(
      formatAllTimeRange(newYork) ?? "",
      /^all-time range \$18\.47 \(week of \d{4}-\d{2}-\d{2}\) to \$22\.28 \(week of \d{4}-\d{2}-\d{2}\) across 46 prints$/,
    );
  });

  it("omits the range when fewer than three tracked prints exist", () => {
    assert.equal(formatAllTimeRange(null), null);
    assert.equal(formatAllTimeRange([]), null);
    assert.equal(formatAllTimeRange(weekly([10.77, 14.58])), null);
    assert.equal(
      formatAllTimeRange([
        { week_of: "2026-11-02", bpi_score: 10.77, change_pct: null },
        { week_of: "2026-11-09", bpi_score: 0, change_pct: null },
        { week_of: "2026-11-16", bpi_score: Number.NaN, change_pct: null },
      ]),
      null,
    );
  });
});

describe("ranksPriciestFirst", () => {
  it("numbers the highest BPI as #1, matching /rankings", () => {
    const cities = [
      boardCity("austin", "Austin", 11.46),
      boardCity("portland", "Portland", 14.58),
      boardCity("new-york", "New York", 19.81),
      boardCity("empty", "Empty", null),
    ];
    const ranks = ranksPriciestFirst(cities);
    assert.deepEqual(ranks.get("new-york"), { rank: 1, total: 3 });
    assert.deepEqual(ranks.get("portland"), { rank: 2, total: 3 });
    assert.deepEqual(ranks.get("austin"), { rank: 3, total: 3 });
    assert.equal(ranks.has("empty"), false);
  });

  it("keeps input order when two cities print the same BPI", () => {
    const cities = [
      boardCity("austin", "Austin", 14),
      boardCity("boston", "Boston", 14),
    ];
    const ranks = ranksPriciestFirst(cities);
    assert.equal(ranks.get("austin")?.rank, 1);
    assert.equal(ranks.get("boston")?.rank, 2);
  });
});

describe("recordDirectionsBySlug", () => {
  it("marks a strict new high after eight prior weeks and skips ties and short tapes", () => {
    const high = weekly([10, 11, 12, 13, 14, 12, 11, 13, 20]);
    const tied = weekly([10, 11, 12, 13, 14.5, 12, 11, 13, 14.5]);
    const short = weekly([10, 11, 12, 13, 14, 12, 11, 20]);
    const low = weekly([14, 13, 12, 15, 13, 12, 16, 13, 9]);
    const inside = weekly([10, 11, 12, 13, 14.5, 12, 11, 13, 12.25]);

    const week = high[high.length - 1].week_of;
    const directions = recordDirectionsBySlug(
      [
        { city: { slug: "portland", name: "Portland", state: "OR" }, history: high },
        { city: { slug: "denver", name: "Denver", state: "CO" }, history: tied },
        { city: { slug: "austin", name: "Austin", state: "TX" }, history: short },
        { city: { slug: "cleveland", name: "Cleveland", state: "OH" }, history: low },
        { city: { slug: "chicago", name: "Chicago", state: "IL" }, history: inside },
      ],
      week,
    );
    assert.equal(directions.get("portland"), "high");
    assert.equal(directions.get("cleveland"), "low");
    assert.equal(directions.has("denver"), false);
    assert.equal(directions.has("austin"), false);
    assert.equal(directions.has("chicago"), false);
  });

  it("does not call an earlier extreme a record on a later week", () => {
    const history = weekly([10, 11, 12, 13, 14, 12, 11, 13, 20, 15]);
    const recordWeek = history[8].week_of;
    const laterWeek = history[9].week_of;
    const city = {
      city: { slug: "portland", name: "Portland", state: "OR" },
      history,
    };
    assert.equal(recordDirectionsBySlug([city], recordWeek).get("portland"), "high");
    assert.equal(recordDirectionsBySlug([city], laterWeek).has("portland"), false);
    assert.equal(recordDirectionsBySlug([city], "nope").size, 0);
  });
});

describe("formatCityLlmsLine", () => {
  it("keeps the original line when rank, range, and record are unknown", () => {
    assert.equal(
      formatCityLlmsLine({
        name: "Portland",
        state: "OR",
        url: CITY_URL,
        csvUrl: CSV,
        snapshot: snapshot("2026-11-16", 14.58, 9.6),
        history: weekly([10.77, 14.58]),
        rank: null,
        record: null,
      }),
      `- [Portland, OR](${CITY_URL}): BPI $14.58 for the week of 2026-11-16 (+9.6% week over week); cheapest $5.89 at McDonald's, priciest $24.00 at Portland City Grill; 13 restaurants sampled. CSV: ${CSV}`,
    );
  });

  it("appends rank, the all-time range, and a record high", () => {
    const history = weekly([12, 13, 12.5, 13, 14, 12.2, 13, 13.4, 10.77, 14.58], "2025-09-07");
    // Pin the low and high weeks the city page would show.
    history[8] = { week_of: "2026-11-02", bpi_score: 10.77, change_pct: null };
    history[9] = { week_of: "2026-11-16", bpi_score: 14.58, change_pct: 9.6 };
    assert.equal(
      formatCityLlmsLine({
        name: "Portland",
        state: "OR",
        url: CITY_URL,
        csvUrl: CSV,
        snapshot: snapshot("2026-11-16", 14.58, 9.6),
        history,
        rank: { rank: 6, total: 10 },
        record: "high",
      }),
      `- [Portland, OR](${CITY_URL}): BPI $14.58 for the week of 2026-11-16 (+9.6% week over week); cheapest $5.89 at McDonald's, priciest $24.00 at Portland City Grill; 13 restaurants sampled; #6 of 10, priciest first; all-time range $10.77 (week of 2026-11-02) to $14.58 (week of 2026-11-16) across 10 prints; record high. CSV: ${CSV}`,
    );
  });

  it("states a record low and omits a rank that does not fit the board", () => {
    const history = weekly([14, 13, 12, 15, 13, 12, 16, 13, 9]);
    const line = formatCityLlmsLine({
      name: "Cleveland",
      state: "OH",
      url: "https://burgerprice.com/cities/cleveland",
      csvUrl: "https://burgerprice.com/data/bpi.csv?city=cleveland",
      snapshot: snapshot(history[history.length - 1].week_of, 9, -2.4),
      history,
      rank: { rank: 0, total: 10 },
      record: "low",
    });
    assert.match(line, /; all-time range \$9\.00 \(week of \d{4}-\d{2}-\d{2}\) to \$16\.00 \(week of \d{4}-\d{2}-\d{2}\) across 9 prints; record low\. CSV:/);
    assert.equal(line.includes("priciest first"), false);
  });

  it("drops rank, range, and record when the city has no print yet", () => {
    assert.equal(
      formatCityLlmsLine({
        name: "Portland",
        state: "OR",
        url: CITY_URL,
        csvUrl: CSV,
        snapshot: null,
        history: weekly([10, 11, 12, 13, 14, 12, 11, 13, 20]),
        rank: { rank: 1, total: 10 },
        record: "high",
      }),
      `- [Portland, OR](${CITY_URL}): no print yet`,
    );
  });

  it("says no prior week and still prints the range inside the tape", () => {
    const line = formatCityLlmsLine({
      name: "New York",
      state: "NY",
      url: "https://burgerprice.com/cities/new-york",
      csvUrl: "https://burgerprice.com/data/bpi.csv?city=new-york",
      snapshot: snapshot("2026-11-16", 19.81, null),
      history: [
        { week_of: "2026-03-09", bpi_score: 22.28, change_pct: null },
        { week_of: "2026-03-16", bpi_score: 20, change_pct: null },
        { week_of: "2026-03-23", bpi_score: 18.47, change_pct: null },
        { week_of: "2026-11-16", bpi_score: 19.81, change_pct: null },
      ],
      rank: { rank: 1, total: 10 },
      record: null,
    });
    assert.match(line, /\(no prior week\)/);
    assert.match(
      line,
      /#1 of 10, priciest first; all-time range \$18\.47 \(week of 2026-03-23\) to \$22\.28 \(week of 2026-03-09\) across 4 prints\. CSV:/,
    );
    assert.equal(line.includes("record"), false);
  });
});
