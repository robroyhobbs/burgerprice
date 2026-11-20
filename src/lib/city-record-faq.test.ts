import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";
import {
  buildCityRecordFaqAnswer,
  buildTradingRange,
  buildTradingRangeStory,
  CITY_RECORD_FAQ_MIN_PRINTS,
  classifyRecordPrint,
  formatTapeWeek,
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

function faqContext(
  history: SnapshotLike[] | null | undefined,
  overrides: Record<string, unknown> = {},
) {
  return {
    name: "Portland",
    state: "OR",
    slug: "portland-or",
    bpi: 14.58,
    changePct: 1.2,
    weekOf: "2026-11-16",
    rank: 4,
    totalCities: 20,
    nationalAvg: 13.5,
    cheapestRestaurant: "Low",
    cheapestPrice: 4.25,
    mostExpensiveRestaurant: "High",
    mostExpensivePrice: 24,
    sampleSize: 12,
    peerCities: [{ name: "Seattle", state: "WA", bpi: 14.2 }],
    history,
    ...overrides,
  };
}

const RECORD_Q =
  "What's Portland's highest and lowest Burger Price Index on record?";

describe("buildCityRecordFaqAnswer", () => {
  it("states the record high when this week is the top of the range", () => {
    const history = weekly([10.77, 12.1, 14.58]);
    const range = buildTradingRange(history);
    assert.ok(range);
    assert.equal(range.high.bpi, 14.58);
    assert.equal(range.low.bpi, 10.77);
    assert.equal(range.weeks, 3);
    assert.match(
      buildTradingRangeStory("Portland", range),
      /highest burger since tracking began/,
    );

    const answer = buildCityRecordFaqAnswer("Portland", history);
    assert.equal(
      answer,
      "Portland's record-high BPI is $14.58 (week of Nov 16, 2026) and its record low is $10.77 (week of Nov 2, 2026), across 3 weekly prints since tracking began in Nov 2026. This week's $14.58 is the record high.",
    );
    assert.equal(answer?.includes("!"), false);
    assert.equal(
      formatTapeWeek(range.high.weekOf),
      "Nov 16",
    );
  });

  it("states the record low when this week is the bottom of the range", () => {
    const history = weekly([14.58, 12.1, 10.77]);
    const range = buildTradingRange(history);
    assert.ok(range);
    assert.match(
      buildTradingRangeStory("Portland", range),
      /cheapest burger since tracking began/,
    );

    assert.equal(
      buildCityRecordFaqAnswer("Portland", history),
      "Portland's record-high BPI is $14.58 (week of Nov 2, 2026) and its record low is $10.77 (week of Nov 16, 2026), across 3 weekly prints since tracking began in Nov 2026. This week's $10.77 is the record low.",
    );
  });

  it("omits the record sentence when this week sits inside the range", () => {
    const history = weekly([10.77, 14.58, 12.4]);
    const range = buildTradingRange(history);
    assert.ok(range);
    assert.equal(range.last.bpi, 12.4);
    assert.doesNotMatch(
      buildTradingRangeStory("Portland", range),
      /highest burger|cheapest burger/,
    );

    const answer = buildCityRecordFaqAnswer("Portland", [...history].reverse());
    assert.equal(
      answer,
      "Portland's record-high BPI is $14.58 (week of Nov 9, 2026) and its record low is $10.77 (week of Nov 2, 2026), across 3 weekly prints since tracking began in Nov 2026.",
    );
    assert.equal(answer?.includes("This week's"), false);
    assert.equal(answer?.includes("!"), false);
  });

  it("returns null when fewer than two tracked prints exist", () => {
    assert.equal(CITY_RECORD_FAQ_MIN_PRINTS, 2);
    assert.equal(buildCityRecordFaqAnswer("Portland", null), null);
    assert.equal(buildCityRecordFaqAnswer("Portland", undefined), null);
    assert.equal(buildCityRecordFaqAnswer("Portland", []), null);
    assert.equal(buildCityRecordFaqAnswer("Portland", weekly([14.58])), null);

    const junk: SnapshotLike[] = [
      { week_of: "2026-11-02", bpi_score: 10.77, change_pct: null },
      { week_of: "2026-11-09", bpi_score: 0, change_pct: null },
      { week_of: "2026-11-16", bpi_score: Number.NaN, change_pct: null },
      { week_of: "", bpi_score: 99, change_pct: null },
    ];
    assert.equal(buildCityRecordFaqAnswer("Portland", junk), null);
    assert.equal(buildTradingRange(junk, CITY_RECORD_FAQ_MIN_PRINTS), null);

    const two = weekly([10.77, 14.58]);
    assert.equal(buildTradingRange(two), null);
    const answer = buildCityRecordFaqAnswer("Portland", two);
    assert.equal(
      answer,
      "Portland's record-high BPI is $14.58 (week of Nov 9, 2026) and its record low is $10.77 (week of Nov 2, 2026), across 2 weekly prints since tracking began in Nov 2026. This week's $14.58 is the record high.",
    );
    const shown = buildTradingRange(two, CITY_RECORD_FAQ_MIN_PRINTS);
    assert.ok(shown);
    assert.equal(shown.high.bpi, 14.58);
    assert.equal(shown.low.bpi, 10.77);
    assert.equal(shown.weeks, 2);
  });

  it("treats a tie with the prior extreme as the record, unlike classifyRecordPrint", () => {
    const tiedHigh = weekly([10, 11, 12, 13, 14.5, 12, 11, 13, 14.5], "2025-12-22");
    assert.equal(classifyRecordPrint(tiedHigh), null);
    const highRange = buildTradingRange(tiedHigh);
    assert.ok(highRange);
    assert.match(
      buildTradingRangeStory("Denver", highRange),
      /highest burger since tracking began Dec 2025/,
    );
    const highAnswer = buildCityRecordFaqAnswer("Denver", tiedHigh);
    assert.match(highAnswer ?? "", /This week's \$14\.50 is the record high\.$/);
    assert.doesNotMatch(highAnswer ?? "", /is the record low\./);

    const tiedLow = weekly([14, 13, 11.25, 15, 13, 12, 16, 13, 11.25], "2025-12-22");
    assert.equal(classifyRecordPrint(tiedLow), null);
    const lowRange = buildTradingRange(tiedLow);
    assert.ok(lowRange);
    assert.match(
      buildTradingRangeStory("Cleveland", lowRange),
      /cheapest burger since tracking began/,
    );
    const lowAnswer = buildCityRecordFaqAnswer("Cleveland", tiedLow);
    assert.match(lowAnswer ?? "", /This week's \$11\.25 is the record low\.$/);
    assert.doesNotMatch(lowAnswer ?? "", /is the record high\./);

    const flat = weekly([12, 12, 12], "2025-12-22");
    const flatRange = buildTradingRange(flat);
    assert.ok(flatRange);
    assert.equal(flatRange.high.weekOf, flatRange.low.weekOf);
    assert.match(
      buildTradingRangeStory("Austin", flatRange),
      /highest burger since tracking began/,
    );
    const flatAnswer = buildCityRecordFaqAnswer("Austin", flat);
    assert.match(flatAnswer ?? "", /This week's \$12\.00 is the record high\.$/);
    assert.doesNotMatch(flatAnswer ?? "", /is the record low\./);
  });
});

describe("buildCityFaqItems record entry", () => {
  it("inserts the record question after the cheapest-burger question and into JSON-LD", () => {
    const history = weekly([10.77, 12.1, 14.58]);
    const items = buildCityFaqItems(faqContext(history));
    const questions = items.map((item) => item.q);
    const cheap = questions.indexOf(
      "What's the cheapest and most expensive burger in Portland?",
    );
    const record = questions.indexOf(RECORD_Q);
    const read = questions.indexOf("How do I read Portland's BPI?");
    assert.ok(cheap >= 0);
    assert.equal(record, cheap + 1);
    assert.equal(read, record + 1);
    assert.equal(items[record].a, buildCityRecordFaqAnswer("Portland", history));

    const jsonLd = buildFaqPageJsonLd(items);
    const entities = jsonLd.mainEntity as {
      name: string;
      acceptedAnswer: { text: string };
    }[];
    assert.equal(entities[record].name, RECORD_Q);
    assert.equal(entities[record].acceptedAnswer.text, items[record].a);
  });

  it("drops the entry when history is too short, and still slots it before the BPI explainer", () => {
    const short = buildCityFaqItems(faqContext(weekly([14.58])));
    assert.equal(
      short.some((item) => item.q === RECORD_Q),
      false,
    );
    const cheap = short.findIndex((item) =>
      item.q.startsWith("What's the cheapest"),
    );
    const read = short.findIndex((item) => item.q.startsWith("How do I read"));
    assert.equal(read, cheap + 1);

    const noTape = buildCityFaqItems(
      faqContext(weekly([10, 14, 12]), {
        cheapestRestaurant: null,
        cheapestPrice: null,
        mostExpensiveRestaurant: null,
        mostExpensivePrice: null,
      }),
    );
    const questions = noTape.map((item) => item.q);
    assert.equal(
      questions.indexOf(RECORD_Q),
      questions.indexOf("How do I read Portland's BPI?") - 1,
    );
    assert.equal(
      questions.includes(
        "What's the cheapest and most expensive burger in Portland?",
      ),
      false,
    );
  });
});
