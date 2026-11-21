import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTradingRange,
  buildTradingRangeStory,
  classifyRecordPrint,
  findRecordPrints,
  findRecordPrintsForWeek,
  buildRecordWatchFaq,
  formatRecordPrintLine,
  formatRecordWatchCopy,
  formatTrackingBegan,
  RECORD_WATCH_FAQ_QUESTION,
  recordPrintTokens,
  type SnapshotLike,
} from "./city-readout.ts";

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function weekly(scores: number[], start = "2025-12-22"): SnapshotLike[] {
  return scores.map((bpi, i) => ({
    week_of: addDays(start, i * 7),
    bpi_score: bpi,
    change_pct: null,
  }));
}

function city(slug: string, name: string, history: SnapshotLike[]) {
  return { city: { slug, name, state: "XX" }, history };
}

describe("classifyRecordPrint", () => {
  it("flags a print strictly above every prior week", () => {
    const history = weekly([10, 11, 12, 13, 14.23, 12, 11, 13, 14.58]);
    const record = classifyRecordPrint(history);
    assert.equal(record?.direction, "high");
    assert.equal(record?.bpi, 14.58);
    assert.equal(record?.priorExtreme, 14.23);
    assert.equal(record?.priorWeeks, 8);
    assert.equal(formatTrackingBegan(record?.firstWeekOf ?? ""), "Dec 2025");
    assert.equal(
      formatRecordPrintLine("high", [
        {
          slug: "portland-or",
          name: "Portland",
          bpi: record?.bpi ?? 0,
          sinceLabel: formatTrackingBegan(record?.firstWeekOf ?? ""),
        },
      ]),
      "Record high: Portland, $14.58, highest print since tracking began (Dec 2025).",
    );
  });

  it("flags a print strictly below every prior week", () => {
    const history = weekly([14, 13, 12.2, 15, 13, 12.5, 16, 13.1, 9.5], "2026-01-05");
    const record = classifyRecordPrint(history);
    assert.equal(record?.direction, "low");
    assert.equal(record?.bpi, 9.5);
    assert.equal(record?.priorExtreme, 12.2);
    assert.equal(formatTrackingBegan(record?.firstWeekOf ?? ""), "Jan 2026");
    assert.equal(
      formatRecordPrintLine("low", [
        {
          slug: "cleveland-oh",
          name: "Cleveland",
          bpi: 9.5,
          sinceLabel: "Jan 2026",
        },
      ]),
      "Record low: Cleveland, $9.50, lowest print since tracking began (Jan 2026).",
    );
  });

  it("stays quiet when the latest print is inside the prior range", () => {
    const history = weekly([10, 11, 12, 13, 14.5, 12, 11, 13, 12.25]);
    assert.equal(classifyRecordPrint(history), null);
    assert.equal(formatRecordPrintLine("high", []), null);
    assert.equal(recordPrintTokens("low", []), null);
  });

  it("ignores a history shorter than eight prior weeks", () => {
    const sevenPrior = weekly([10, 11, 12, 13, 14, 12, 11, 20]);
    assert.equal(sevenPrior.length, 8);
    assert.equal(classifyRecordPrint(sevenPrior), null);

    const padded: SnapshotLike[] = [
      ...weekly([10, 11, 12, 13, 14, 12, 11]),
      { week_of: "2026-02-16", bpi_score: 0, change_pct: null },
      { week_of: "2026-02-23", bpi_score: Number.NaN, change_pct: null },
      { week_of: "2026-03-02", bpi_score: -3, change_pct: null },
      { week_of: "2026-03-09", bpi_score: 99, change_pct: null },
    ];
    assert.equal(classifyRecordPrint(padded), null);

    const eightPrior = weekly([10, 11, 12, 13, 14, 12, 11, 13, 20]);
    assert.equal(classifyRecordPrint(eightPrior)?.direction, "high");
  });

  it("does not count a tie with the prior high or low", () => {
    const tiedHigh = weekly([10, 11, 12, 13, 14.5, 12, 11, 13, 14.5]);
    assert.equal(classifyRecordPrint(tiedHigh), null);

    const tiedLow = weekly([14, 13, 11.25, 15, 13, 12, 16, 13, 11.25]);
    assert.equal(classifyRecordPrint(tiedLow), null);

    const history = [...tiedHigh].reverse();
    const range = buildTradingRange(history);
    assert.ok(range);
    assert.equal(range.last.bpi, 14.5);
    assert.equal(range.last.weekOf, range.high.weekOf);
    assert.match(
      buildTradingRangeStory("Denver", range),
      /highest burger since tracking began Dec 2025/,
    );
  });

  it("reads the newest week when history is not chronological", () => {
    const ordered = weekly([10, 11, 12, 13, 14.23, 12, 11, 13, 14.58]);
    const record = classifyRecordPrint([...ordered].reverse());
    assert.equal(record?.direction, "high");
    assert.equal(record?.bpi, 14.58);
    assert.equal(record?.weekOf, ordered[ordered.length - 1].week_of);
    assert.equal(record?.priorExtreme, 14.23);
  });
});

describe("findRecordPrints", () => {
  it("lists highs and lows on the newest week and skips short or stale tapes", () => {
    const seattle = weekly([10, 11, 12, 13, 14, 12, 11, 13, 15, 22]);
    const portland = weekly([10, 11, 12, 13, 14, 12, 11, 13, 15, 18]);
    const cleveland = weekly([14, 13, 12.2, 15, 13, 12.5, 16, 13.1, 14, 9]);
    const quiet = weekly([10, 11, 12, 13, 14, 12, 11, 13, 12, 13]);
    const latest = seattle[seattle.length - 1].week_of;
    const short: SnapshotLike[] = [
      ...weekly([10, 11, 30]).slice(0, 3),
      { week_of: latest, bpi_score: 40, change_pct: null },
    ];
    const stale = weekly([10, 11, 12, 13, 14, 12, 11, 13, 30, 12]).slice(0, 9);
    assert.equal(classifyRecordPrint(stale)?.direction, "high");
    assert.notEqual(stale[stale.length - 1].week_of, latest);

    const { highs, lows } = findRecordPrints([
      city("portland-or", "Portland", portland),
      city("seattle-wa", "Seattle", seattle),
      city("cleveland-oh", "Cleveland", cleveland),
      city("quiet-xx", "Quiet", quiet),
      city("miami-fl", "Miami", short),
      city("denver-co", "Denver", stale),
    ]);

    assert.deepEqual(
      highs.map((c) => c.name),
      ["Seattle", "Portland"],
    );
    assert.deepEqual(
      lows.map((c) => c.name),
      ["Cleveland"],
    );
    assert.equal(highs[0].sinceLabel, "Dec 2025");
    assert.equal(
      formatRecordPrintLine("high", highs),
      "Record high: Seattle, $22.00, Portland, $18.00, highest prints since tracking began (Dec 2025).",
    );
    assert.equal(
      formatRecordPrintLine("low", lows),
      "Record low: Cleveland, $9.00, lowest print since tracking began (Dec 2025).",
    );

    const tokens = recordPrintTokens("high", highs);
    assert.deepEqual(
      tokens?.filter((t) => t.type === "city"),
      [
        { type: "city", slug: "seattle-wa", name: "Seattle" },
        { type: "city", slug: "portland-or", name: "Portland" },
      ],
    );
  });

  it("keeps a different tracking-began month next to each city", () => {
    assert.equal(
      formatRecordPrintLine("high", [
        { slug: "portland-or", name: "Portland", bpi: 14.58, sinceLabel: "Dec 2025" },
        { slug: "miami-fl", name: "Miami", bpi: 13.1, sinceLabel: "Mar 2026" },
      ]),
      "Record high: Portland, $14.58, highest print since tracking began (Dec 2025), Miami, $13.10, highest print since tracking began (Mar 2026).",
    );
  });

  it("returns nothing when no city printed a record", () => {
    assert.deepEqual(findRecordPrints([]), { highs: [], lows: [] });
    const quiet = weekly([10, 11, 12, 13, 14, 12, 11, 13, 12]);
    assert.deepEqual(findRecordPrints([city("austin-tx", "Austin", quiet)]), {
      highs: [],
      lows: [],
    });
  });
});

describe("findRecordPrintsForWeek", () => {
  // Nine weeks ending on Portland's record. Two later prints are decoys:
  // a quiet week, then a higher record the earlier issue must not see.
  const throughRecord = weekly([10, 11, 12, 13, 14.23, 12, 11, 13, 14.58]);
  const withLaterWeeks = weekly([10, 11, 12, 13, 14.23, 12, 11, 13, 14.58, 13.4, 16.2]);
  const austin = weekly([10, 11, 12, 13, 14, 12, 11, 13, 12.5, 13, 13.2]);
  const recordWeek = throughRecord[throughRecord.length - 1].week_of;
  const quietWeek = withLaterWeeks[9].week_of;
  const laterWeek = withLaterWeeks[withLaterWeeks.length - 1].week_of;
  const line =
    "Record high: Portland, $14.58, highest print since tracking began (Dec 2025).";

  it("shows the record on the latest issue", () => {
    const { highs, lows } = findRecordPrintsForWeek(
      [
        city("portland-or", "Portland", throughRecord),
        city("austin-tx", "Austin", austin.slice(0, throughRecord.length)),
      ],
      recordWeek,
    );
    assert.equal(highs[0]?.bpi, 14.58);
    assert.equal(highs[0]?.priorExtreme, 14.23);
    assert.equal(highs[0]?.weekOf, recordWeek);
    assert.deepEqual(
      highs.map((item) => item.name),
      ["Portland"],
    );
    assert.equal(formatRecordPrintLine("high", highs), line);
    assert.equal(formatRecordPrintLine("low", lows), null);
  });

  it("computes an earlier issue from history up to that week", () => {
    const cities = [
      city("portland-or", "Portland", withLaterWeeks),
      city("austin-tx", "Austin", austin),
    ];
    const earlier = findRecordPrintsForWeek(cities, recordWeek);
    assert.equal(formatRecordPrintLine("high", earlier.highs), line);
    assert.equal(earlier.highs[0]?.priorExtreme, 14.23);
    assert.equal(earlier.highs[0]?.weekOf, recordWeek);
    assert.equal(formatRecordPrintLine("low", earlier.lows), null);

    const leaked = findRecordPrints(cities);
    assert.equal(leaked.highs[0]?.bpi, 16.2);
    assert.equal(leaked.highs[0]?.weekOf, laterWeek);

    const later = findRecordPrintsForWeek(cities, laterWeek);
    assert.equal(later.highs[0]?.bpi, 16.2);
    assert.equal(later.highs[0]?.priorExtreme, 14.58);
    assert.equal(
      formatRecordPrintLine("high", later.highs),
      "Record high: Portland, $16.20, highest print since tracking began (Dec 2025).",
    );
  });

  it("omits the line when that week set no record", () => {
    const { highs, lows } = findRecordPrintsForWeek(
      [
        city("portland-or", "Portland", withLaterWeeks),
        city("austin-tx", "Austin", austin),
      ],
      quietWeek,
    );
    assert.deepEqual(highs, []);
    assert.deepEqual(lows, []);
    assert.equal(formatRecordPrintLine("high", highs), null);
    assert.equal(formatRecordPrintLine("low", lows), null);
    assert.equal(recordPrintTokens("high", highs), null);
    assert.equal(recordPrintTokens("low", lows), null);
  });

  it("does not borrow an earlier record when the issue week has no print", () => {
    const { highs, lows } = findRecordPrintsForWeek(
      [city("portland-or", "Portland", throughRecord)],
      "2026-11-16",
    );
    assert.deepEqual(highs, []);
    assert.deepEqual(lows, []);
    assert.equal(formatRecordPrintLine("high", highs), null);
  });
});

describe("formatRecordWatchCopy", () => {
  const portland = {
    slug: "portland-or",
    name: "Portland",
    bpi: 14.58,
    sinceLabel: "Dec 2025",
  };
  const highLine =
    "Record high: Portland, $14.58, highest print since tracking began (Dec 2025).";
  const lowLine =
    "Record low: Cleveland, $9.50, lowest print since tracking began (Jan 2026).";

  it("joins the same sentences /rankings prints, high then low", () => {
    assert.equal(
      formatRecordWatchCopy({ highs: [portland], lows: [] }),
      highLine,
    );
    assert.equal(
      formatRecordWatchCopy({
        highs: [portland],
        lows: [
          {
            slug: "cleveland-oh",
            name: "Cleveland",
            bpi: 9.5,
            sinceLabel: "Jan 2026",
          },
        ],
      }),
      `${highLine} ${lowLine}`,
    );
  });

  it("stays quiet when the week set no record", () => {
    assert.equal(formatRecordWatchCopy({ highs: [], lows: [] }), null);
    assert.equal(buildRecordWatchFaq({ highs: [], lows: [] }), null);
  });

  it("builds an FAQ answer that matches the callout, and omits in-range weeks", () => {
    const faq = buildRecordWatchFaq({ highs: [portland], lows: [] });
    assert.deepEqual(faq, { q: RECORD_WATCH_FAQ_QUESTION, a: highLine });

    const throughRecord = weekly([10, 11, 12, 13, 14.23, 12, 11, 13, 14.58]);
    const quiet = weekly([10, 11, 12, 13, 14.23, 12, 11, 13, 14.58, 13.4]);
    const recordWeek = throughRecord[throughRecord.length - 1].week_of;
    const quietWeek = quiet[quiet.length - 1].week_of;
    const onRecord = findRecordPrintsForWeek(
      [city("portland-or", "Portland", throughRecord)],
      recordWeek,
    );
    assert.equal(formatRecordWatchCopy(onRecord), highLine);
    assert.equal(buildRecordWatchFaq(onRecord)?.a, highLine);

    const inRange = findRecordPrintsForWeek(
      [city("portland-or", "Portland", quiet)],
      quietWeek,
    );
    assert.equal(formatRecordWatchCopy(inRange), null);
    assert.equal(buildRecordWatchFaq(inRange), null);
  });
});
