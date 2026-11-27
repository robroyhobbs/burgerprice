import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";
import {
  buildCityMomentumFaq,
  buildFourWeekAverage,
  buildMomentumReadout,
  buildPrintStreak,
  formatFourWeekAverage,
  formatPrintStreak,
  FOUR_WEEK_AVERAGE_PRINTS,
  type SnapshotLike,
} from "./city-readout.ts";

register(new URL("./ts-resolve-hook.mjs", import.meta.url));

const { buildCityFaqItems, buildFaqPageJsonLd } = await import("./json-ld.ts");

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

function faqContext(history: SnapshotLike[] | null | undefined) {
  return {
    name: "Boston",
    state: "MA",
    slug: "boston-ma",
    bpi: 18.36,
    changePct: 13.6,
    weekOf: "2026-11-23",
    rank: 2,
    totalCities: 20,
    nationalAvg: 15.1,
    cheapestRestaurant: "Low",
    cheapestPrice: 4.25,
    mostExpensiveRestaurant: "High",
    mostExpensivePrice: 24,
    sampleSize: 12,
    peerCities: [{ name: "Seattle", state: "WA", bpi: 14.2 }],
    history,
  };
}

const MOMENTUM_Q = "Is Boston's Burger Price Index trending up or down?";

describe("buildPrintStreak", () => {
  it("returns null for a single print, empty history, or no history", () => {
    assert.equal(buildPrintStreak(null), null);
    assert.equal(buildPrintStreak(undefined), null);
    assert.equal(buildPrintStreak([]), null);
    assert.equal(buildPrintStreak(weekly([18.36])), null);
    assert.equal(formatPrintStreak({ direction: "up", length: 1 }), "Up 1 straight print");
  });

  it("counts a strict up or down run and stops at a direction change", () => {
    assert.deepEqual(buildPrintStreak(weekly([10, 11, 12, 13])), {
      direction: "up",
      length: 3,
    });
    assert.equal(
      formatPrintStreak(buildPrintStreak(weekly([10, 11, 12, 13]))!),
      "Up 3 straight prints",
    );

    assert.deepEqual(buildPrintStreak(weekly([13, 12, 11])), {
      direction: "down",
      length: 2,
    });
    assert.equal(
      formatPrintStreak(buildPrintStreak(weekly([13, 12, 11]))!),
      "Down 2 straight prints",
    );

    assert.deepEqual(buildPrintStreak(weekly([10, 12, 11])), {
      direction: "down",
      length: 1,
    });
    assert.equal(
      formatPrintStreak(buildPrintStreak(weekly([10, 12, 11]))!),
      "Down 1 straight print",
    );
  });

  it("treats an equal print as flat, which breaks the streak", () => {
    assert.deepEqual(buildPrintStreak(weekly([10, 11])), {
      direction: "up",
      length: 1,
    });
    const flat = weekly([10, 11, 12, 12]);
    assert.deepEqual(buildPrintStreak(flat), { direction: "flat", length: 1 });
    assert.equal(formatPrintStreak(buildPrintStreak(flat)!), "Flat vs last print");

    const severalFlats = weekly([10, 11, 11, 11]);
    assert.deepEqual(buildPrintStreak(severalFlats), {
      direction: "flat",
      length: 1,
    });
    assert.equal(
      formatPrintStreak(buildPrintStreak(severalFlats)!),
      "Flat vs last print",
    );

    const resumed = weekly([10, 11, 12, 12, 13, 14]);
    assert.deepEqual(buildPrintStreak(resumed), { direction: "up", length: 2 });
    assert.equal(formatPrintStreak(buildPrintStreak(resumed)!), "Up 2 straight prints");
  });

  it("reads the tracked series, ignoring junk rows and input order", () => {
    const messy: SnapshotLike[] = [
      { week_of: "2026-11-16", bpi_score: 12, change_pct: null },
      { week_of: "2026-11-09", bpi_score: 0, change_pct: null },
      { week_of: "2026-11-02", bpi_score: 10, change_pct: null },
      { week_of: "", bpi_score: 99, change_pct: null },
      { week_of: "2026-11-23", bpi_score: Number.NaN, change_pct: null },
      { week_of: "2026-11-09", bpi_score: 11, change_pct: 1 },
    ];
    assert.deepEqual(buildPrintStreak(messy), { direction: "up", length: 2 });

    const gapped: SnapshotLike[] = [
      { week_of: "2026-11-02", bpi_score: 10, change_pct: null },
      { week_of: "2026-11-16", bpi_score: 11, change_pct: null },
      { week_of: "2026-11-23", bpi_score: 12, change_pct: null },
    ];
    assert.deepEqual(buildPrintStreak(gapped), { direction: "up", length: 2 });
  });
});

describe("buildFourWeekAverage", () => {
  it("returns null below four tracked prints", () => {
    assert.equal(FOUR_WEEK_AVERAGE_PRINTS, 4);
    assert.equal(buildFourWeekAverage(null), null);
    assert.equal(buildFourWeekAverage(undefined), null);
    assert.equal(buildFourWeekAverage([]), null);
    assert.equal(buildFourWeekAverage(weekly([18.36])), null);
    assert.equal(buildFourWeekAverage(weekly([10, 11, 12])), null);

    const junk: SnapshotLike[] = [
      { week_of: "2026-11-02", bpi_score: 10, change_pct: null },
      { week_of: "2026-11-09", bpi_score: 11, change_pct: null },
      { week_of: "2026-11-16", bpi_score: 12, change_pct: null },
      { week_of: "2026-11-23", bpi_score: 0, change_pct: null },
      { week_of: "", bpi_score: 40, change_pct: null },
    ];
    assert.equal(buildFourWeekAverage(junk), null);
  });

  it("averages the latest four prints and places this print against that average", () => {
    const above = weekly([10, 18, 18.2, 18, 18.2]);
    assert.deepEqual(buildFourWeekAverage(above), {
      average: 18.1,
      latest: 18.2,
      delta: 0.1,
    });
    assert.equal(
      formatFourWeekAverage(buildFourWeekAverage(above)!),
      "4-week average $18.10; this print is $0.10 above it.",
    );

    const below = weekly([18.36, 18.1, 18, 17.94]);
    assert.deepEqual(buildFourWeekAverage(below), {
      average: 18.1,
      latest: 17.94,
      delta: -0.16,
    });
    assert.equal(
      formatFourWeekAverage(buildFourWeekAverage(below)!),
      "4-week average $18.10; this print is $0.16 below it.",
    );

    const flat = weekly([9, 10, 12, 11, 11]);
    assert.deepEqual(buildFourWeekAverage(flat), {
      average: 11,
      latest: 11,
      delta: 0,
    });
    assert.equal(
      formatFourWeekAverage(buildFourWeekAverage(flat)!),
      "4-week average $11.00; this print is flat to it.",
    );
  });

  it("rounds a half-cent mean to the displayed average", () => {
    const history = weekly([10, 10, 10, 10.02]);
    assert.deepEqual(buildFourWeekAverage(history), {
      average: 10.01,
      latest: 10.02,
      delta: 0.01,
    });
  });
});

describe("buildMomentumReadout and FAQ", () => {
  it("joins the streak and the 4-week average into one FAQ answer", () => {
    const history = weekly([16.46, 15.2, 16.16, 18.36]);
    const readout = buildMomentumReadout(history);
    assert.deepEqual(readout, {
      streakLine: "Up 2 straight prints",
      averageLine: "4-week average $16.55; this print is $1.81 above it.",
    });

    const faq = buildCityMomentumFaq("Boston", history);
    assert.deepEqual(faq, {
      q: MOMENTUM_Q,
      a: "Up 2 straight prints. 4-week average $16.55; this print is $1.81 above it.",
    });
    assert.equal(faq?.a.includes("!"), false);
  });

  it("keeps the streak and drops the average when the tape is shorter than four prints", () => {
    const history = weekly([10.77, 13.3, 14.58]);
    const readout = buildMomentumReadout(history);
    assert.equal(readout.streakLine, "Up 2 straight prints");
    assert.equal(readout.averageLine, null);
    assert.equal(
      buildCityMomentumFaq("Portland", history)?.a,
      "Up 2 straight prints.",
    );
  });

  it("answers flat when the latest print matches the prior print", () => {
    const history = weekly([12, 13, 14, 14]);
    assert.equal(
      buildCityMomentumFaq("Austin", history)?.a,
      "Flat vs last print. 4-week average $13.25; this print is $0.75 above it.",
    );
  });

  it("omits the FAQ when a single print cannot show a direction", () => {
    assert.equal(buildCityMomentumFaq("Boston", weekly([18.36])), null);
    assert.equal(buildCityMomentumFaq("Boston", null), null);
    assert.deepEqual(buildMomentumReadout(weekly([18.36])), {
      streakLine: null,
      averageLine: null,
    });
  });

  it("adds the question to the city FAQ and the FAQPage JSON-LD", () => {
    const history = weekly([16.46, 15.2, 16.16, 18.36]);
    const items = buildCityFaqItems(faqContext(history));
    const questions = items.map((item) => item.q);
    const record = questions.indexOf(
      "What's Boston's highest and lowest Burger Price Index on record?",
    );
    const momentum = questions.indexOf(MOMENTUM_Q);
    const read = questions.indexOf("How do I read Boston's BPI?");
    assert.equal(momentum, record + 1);
    assert.equal(read, momentum + 1);
    assert.equal(items[momentum].a, buildCityMomentumFaq("Boston", history)?.a);

    const jsonLd = buildFaqPageJsonLd(items);
    const entities = jsonLd.mainEntity as {
      name: string;
      acceptedAnswer: { text: string };
    }[];
    assert.equal(entities[momentum].name, MOMENTUM_Q);
    assert.equal(entities[momentum].acceptedAnswer.text, items[momentum].a);
  });

  it("drops the FAQ entry when history is a single print", () => {
    const items = buildCityFaqItems(faqContext(weekly([18.36])));
    assert.equal(
      items.some((item) => item.q === MOMENTUM_Q),
      false,
    );
  });
});
