import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";
import {
  buildFourWeekAverage,
  buildPrintStreak,
  formatPrintStreak,
  selectTrackedPrints,
  type SnapshotLike,
} from "./city-readout.ts";
import type { MomentumBoardRow, MomentumCity } from "./momentum-board.ts";

register(new URL("./ts-resolve-hook.mjs", import.meta.url));

const {
  buildMomentumBoard,
  buildMomentumBoardFaq,
  formatMomentumGap,
  MOMENTUM_BOARD_HREF,
  MOMENTUM_BOARD_LINK_LABEL,
  MOMENTUM_BOARD_QUESTION,
} = await import("./momentum-board.ts");

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

function city(
  slug: string,
  name: string,
  scores: number[] | null,
  state = "XX",
): MomentumCity {
  return {
    slug,
    name,
    state,
    history: scores ? weekly(scores) : null,
  };
}

function assertMatchesCityPages(
  rows: readonly MomentumBoardRow[],
  cities: readonly MomentumCity[],
) {
  const bySlug = new Map(cities.map((entry) => [entry.slug, entry]));
  for (const row of rows) {
    const source = bySlug.get(row.slug);
    assert.ok(source);
    const average = buildFourWeekAverage(source.history);
    const streak = buildPrintStreak(source.history);
    const prints = selectTrackedPrints(source.history);
    assert.equal(row.average, average?.average ?? null);
    assert.equal(row.gap, average?.delta ?? null);
    assert.equal(
      row.latest,
      average ? average.latest : (prints.at(-1)?.bpi_score ?? null),
    );
    assert.equal(row.streak, streak ? formatPrintStreak(streak) : null);
    assert.equal(row.streakDirection, streak?.direction ?? null);
    assert.equal(row.streakLength, streak?.length ?? null);
  }
}

describe("formatMomentumGap", () => {
  it("signs the gap the board column prints", () => {
    assert.equal(formatMomentumGap(1.81), "+$1.81");
    assert.equal(formatMomentumGap(-0.17), "-$0.17");
    assert.equal(formatMomentumGap(0), "$0.00");
  });
});

describe("buildMomentumBoard", () => {
  it("ranks the hottest gap first, breaks ties by name, and parks short tapes last", () => {
    const cities = [
      city("seattle", "Seattle", [12, 12, 12, 11]),
      city("miami", "Miami", [10, 11, 12]),
      city("denver", "Denver", [10, 10, 10, 11]),
      city("zed", "Zed", [10, 10, 10, 12]),
      city("austin", "Austin", [10, 10, 10, 11]),
      city("atlanta", "Atlanta", [10]),
    ];
    const rows = buildMomentumBoard(cities);
    assert.ok(rows);
    assert.deepEqual(
      rows.map((row) => row.name),
      ["Zed", "Austin", "Denver", "Seattle", "Atlanta", "Miami"],
    );
    assert.deepEqual(
      rows.map((row) => row.rank),
      [1, 2, 3, 4, 5, 6],
    );

    const miami = rows.find((row) => row.slug === "miami");
    assert.ok(miami);
    assert.equal(miami.latest, 12);
    assert.equal(miami.average, null);
    assert.equal(miami.gap, null);
    assert.equal(miami.streak, "Up 2 straight prints");

    const atlanta = rows.find((row) => row.slug === "atlanta");
    assert.ok(atlanta);
    assert.equal(atlanta.streak, null);
    assert.equal(atlanta.latest, 10);
    assert.equal(atlanta.average, null);
    assert.equal(atlanta.gap, null);

    const austin = rows.find((row) => row.slug === "austin");
    const denver = rows.find((row) => row.slug === "denver");
    assert.equal(austin?.gap, denver?.gap);
    assert.ok((austin?.rank ?? 0) < (denver?.rank ?? 0));
    assertMatchesCityPages(rows, cities);
  });

  it("does not let a huge short tape jump a city that has a gap", () => {
    const cities = [
      city("short", "Short", [100, 200, 300]),
      city("quiet", "Quiet", [10, 10, 10, 10.01]),
    ];
    const rows = buildMomentumBoard(cities);
    assert.ok(rows);
    assert.deepEqual(
      rows.map((row) => row.slug),
      ["quiet", "short"],
    );
    assert.equal(rows[1].average, null);
    assert.equal(rows[1].streak, "Up 2 straight prints");
    assertMatchesCityPages(rows, cities);
  });

  it("keeps the first slug and drops an empty list", () => {
    const rows = buildMomentumBoard([
      city("boston-ma", "Boston", [16.46, 15.2, 16.16, 18.36]),
      city("boston-ma", "Boston", [1, 1, 1, 1]),
      { slug: "", name: "Nope", history: weekly([9, 9, 9, 9]) },
    ]);
    assert.ok(rows);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].latest, 18.36);
    assert.equal(rows[0].gap, 1.81);
    assert.equal(buildMomentumBoard([]), null);
    assert.equal(buildMomentumBoard([{ slug: "", name: "Nope" }]), null);
  });
});

describe("buildMomentumBoardFaq", () => {
  it("names the hottest, the coldest, and a longer streak on a short tape", () => {
    const cities = [
      city("seattle", "Seattle", [12, 12, 12, 11]),
      city("miami", "Miami", [10, 11, 12]),
      city("zed", "Zed", [10, 10, 10, 12]),
    ];
    const rows = buildMomentumBoard(cities);
    const faq = buildMomentumBoardFaq(rows);
    assert.ok(faq);
    assert.equal(faq.q, MOMENTUM_BOARD_QUESTION);
    assert.equal(
      faq.q,
      "Which cities have the most Burger Price Index momentum?",
    );
    assert.equal(
      faq.a,
      "Hottest print, Zed: Up 1 straight print. 4-week average $10.50; this print is $1.50 above it. Coldest print, Seattle: Down 1 straight print. 4-week average $11.75; this print is $0.75 below it. Longest current streak: Miami, Up 2 straight prints. The tape is on the Momentum Board.",
    );
    assert.equal(faq.a.includes("!"), false);
    assert.equal(faq.href, MOMENTUM_BOARD_HREF);
    assert.equal(faq.href, "#momentum");
    assert.equal(faq.linkLabel, MOMENTUM_BOARD_LINK_LABEL);
    assert.equal(faq.a.includes(faq.linkLabel), true);
  });

  it("names every city tied for the cold gap, and groups a split streak tie by name", () => {
    const cities = [
      city("chicago", "Chicago", [11, 15, 14, 13]),
      city("boston", "Boston", [10, 8, 9, 10]),
      city("austin", "Austin", [10, 14, 13, 12]),
    ];
    const faq = buildMomentumBoardFaq(buildMomentumBoard(cities));
    assert.ok(faq);
    assert.equal(
      faq.a,
      "Hottest print, Boston: Up 2 straight prints. 4-week average $9.25; this print is $0.75 above it. Coldest prints, tied. Austin: Down 2 straight prints. 4-week average $12.25; this print is $0.25 below it. Chicago: Down 2 straight prints. 4-week average $13.25; this print is $0.25 below it. Longest current streak is tied: Austin and Chicago, Down 2 straight prints; Boston, Up 2 straight prints. The tape is on the Momentum Board.",
    );
  });

  it("treats one shared gap as a tie and a lone city as the only average", () => {
    const tied = buildMomentumBoardFaq(
      buildMomentumBoard([
        city("denver", "Denver", [10, 10, 10, 11]),
        city("austin", "Austin", [10, 10, 10, 11]),
      ]),
    );
    assert.ok(tied);
    assert.equal(
      tied.a,
      "Every city with a 4-week average is tied. Austin: Up 1 straight print. 4-week average $10.25; this print is $0.75 above it. Denver: Up 1 straight print. 4-week average $10.25; this print is $0.75 above it. Longest current streak is tied: Austin and Denver, Up 1 straight print. The tape is on the Momentum Board.",
    );

    const solo = buildMomentumBoardFaq(
      buildMomentumBoard([
        city("boston-ma", "Boston", [16.46, 15.2, 16.16, 18.36]),
      ]),
    );
    assert.ok(solo);
    assert.equal(
      solo.a,
      "Only city with a 4-week average, Boston: Up 2 straight prints. 4-week average $16.55; this print is $1.81 above it. Longest current streak: Boston, Up 2 straight prints. The tape is on the Momentum Board.",
    );
  });

  it("skips a flat run when naming the longest streak", () => {
    const faq = buildMomentumBoardFaq(
      buildMomentumBoard([
        city("austin", "Austin", [10, 11, 11, 11]),
        city("seattle", "Seattle", [14, 13, 13, 13]),
      ]),
    );
    assert.ok(faq);
    assert.equal(faq.a.includes("Longest"), false);
    assert.equal(faq.a.includes("Flat vs last print"), true);
    assert.equal(
      faq.a,
      "Hottest print, Austin: Flat vs last print. 4-week average $10.75; this print is $0.25 above it. Coldest print, Seattle: Flat vs last print. 4-week average $13.25; this print is $0.25 below it. The tape is on the Momentum Board.",
    );
  });

  it("stays null when the board is hidden or nobody has four prints", () => {
    assert.equal(buildMomentumBoardFaq(null), null);
    assert.equal(
      buildMomentumBoardFaq(buildMomentumBoard([city("miami", "Miami", [10, 11, 12])])),
      null,
    );
    assert.equal(buildMomentumBoardFaq([]), null);
  });
});

describe("week of 2026-11-23", () => {
  // Last four tracked prints from https://burgerprice.com/data/bpi.json.
  // The current streak is decided inside this window for every city.
  const live = [
    city("seattle-wa", "Seattle", [14.69, 16.11, 14.98, 14.41], "WA"),
    city("boston-ma", "Boston", [16.46, 15.2, 16.16, 18.36], "MA"),
    city("portland-or", "Portland", [10.77, 13.3, 14.58, 12.66], "OR"),
    city("new-york-ny", "New York", [19.59, 21.32, 19.81, 21.84], "NY"),
    city("austin-tx", "Austin", [11, 10.51, 11.46, 11.62], "TX"),
    city("chicago-il", "Chicago", [13.48, 13.28, 14.21, 13.68], "IL"),
    city("los-angeles-ca", "Los Angeles", [15.65, 16.22, 14.99, 15.5], "CA"),
    city("new-orleans-la", "New Orleans", [12.55, 13.44, 12.75, 12.55], "LA"),
    city("san-francisco-ca", "San Francisco", [16.64, 16.77, 18.65, 16.86], "CA"),
    city("nashville-tn", "Nashville", [11.24, 11.31, 12.46, 11.09], "TN"),
  ];

  it("orders the ten cities by gap and matches the city-page Boston and Portland lines", () => {
    const rows = buildMomentumBoard(live);
    assert.ok(rows);
    assert.deepEqual(
      rows.map((row) => row.slug),
      [
        "boston-ma",
        "new-york-ny",
        "austin-tx",
        "chicago-il",
        "los-angeles-ca",
        "portland-or",
        "new-orleans-la",
        "san-francisco-ca",
        "nashville-tn",
        "seattle-wa",
      ],
    );

    const boston = rows[0];
    assert.equal(boston.name, "Boston");
    assert.equal(boston.latest, 18.36);
    assert.equal(boston.average, 16.55);
    assert.equal(boston.gap, 1.81);
    assert.equal(formatMomentumGap(boston.gap!), "+$1.81");
    assert.equal(boston.streak, "Up 2 straight prints");

    const portland = rows.find((row) => row.slug === "portland-or");
    assert.ok(portland);
    assert.equal(portland.latest, 12.66);
    assert.equal(portland.average, 12.83);
    assert.equal(portland.gap, -0.17);
    assert.equal(formatMomentumGap(portland.gap!), "-$0.17");
    assert.equal(portland.streak, "Down 1 straight print");
    assertMatchesCityPages(rows, live);
  });

  it("names Boston, Seattle, and the four-way streak tie", () => {
    const faq = buildMomentumBoardFaq(buildMomentumBoard(live));
    assert.ok(faq);
    assert.equal(
      faq.a,
      "Hottest print, Boston: Up 2 straight prints. 4-week average $16.55; this print is $1.81 above it. Coldest print, Seattle: Down 2 straight prints. 4-week average $15.05; this print is $0.64 below it. Longest current streak is tied: Austin and Boston, Up 2 straight prints; New Orleans and Seattle, Down 2 straight prints. The tape is on the Momentum Board.",
    );
  });
});
