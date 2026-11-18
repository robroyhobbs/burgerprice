import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTradingRange,
  buildTradingRangeStory,
  classifyRecordPrint,
  findRecordPrints,
  formatRecordPrintLine,
  formatTrackingBegan,
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
