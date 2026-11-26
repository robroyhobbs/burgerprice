import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";
import type {
  PurchasingPowerToken,
  PurchasingPowerWeekCity,
} from "./newsletter-purchasing-power.ts";
import type { WageTable } from "./purchasing-power-rank.ts";

register(new URL("./ts-resolve-hook.mjs", import.meta.url));

const {
  buildPurchasingPowerBriefForWeek,
  formatPurchasingPowerBrief,
  purchasingPowerBriefTokens,
} = await import("./newsletter-purchasing-power.ts");
const { buildPurchasingPowerBoard, burgersPerHour } = await import(
  "./purchasing-power-rank.ts"
);
const { getAllWages } = await import("./wages.ts");

const WEEK = "2026-11-23";
const PRIOR = "2026-11-16";
const LATER = "2026-11-30";

/**
 * City BPI for the week of Nov 23, 2026 (public /data/bpi.json).
 * Inputs only — burgers/hr is computed through the shared helpers.
 */
const PRINTS_1123: Record<string, number> = {
  "austin-tx": 11.62,
  "boston-ma": 18.36,
  "chicago-il": 13.68,
  "los-angeles-ca": 15.5,
  "nashville-tn": 11.09,
  "new-orleans-la": 12.55,
  "new-york-ny": 21.84,
  "portland-or": 12.66,
  "san-francisco-ca": 16.86,
  "seattle-wa": 14.41,
};

/** Prior print. Seattle and New Orleans moved; the rest match Nov 23. */
const PRINTS_1116: Record<string, number> = {
  ...PRINTS_1123,
  "seattle-wa": 14.98,
  "new-orleans-la": 12.75,
};

const WAGES: WageTable = {
  "seattle-wa": { min_wage: 20, source: "city" },
  "portland-or": { min_wage: 12.2, source: "city" },
  "chicago-il": { min_wage: 12.1, source: "city" },
  "boston-ma": { min_wage: 15, source: "state" },
  "austin-tx": { min_wage: 10, source: "federal" },
  "nashville-tn": { min_wage: 7.25, source: "federal" },
  "new-orleans-la": { min_wage: 7.25, source: "federal" },
  "tie-a": { min_wage: 10, source: "city" },
  "tie-c": { min_wage: 10, source: "city" },
  "tie-b": { min_wage: 10, source: "city" },
  low: { min_wage: 10, source: "federal" },
};

function weekCity(
  slug: string,
  name: string,
  prints: Record<string, number | null>,
  state = "XX",
): PurchasingPowerWeekCity {
  return {
    city: { slug, name, state },
    history: Object.entries(prints).map(([week_of, bpi_score]) => ({
      week_of,
      bpi_score,
    })),
  };
}

function citySlugs(tokens: readonly PurchasingPowerToken[] | null): string[] {
  return (tokens ?? []).flatMap((token) =>
    token.type === "city" ? [token.slug] : [],
  );
}

function liveCities(): PurchasingPowerWeekCity[] {
  const wages = getAllWages();
  return Object.keys(PRINTS_1123).map((slug) => ({
    city: { slug, name: wages[slug].city, state: wages[slug].state },
    history: [
      { week_of: PRIOR, bpi_score: PRINTS_1116[slug] },
      { week_of: `${WEEK}T00:00:00.000Z`, bpi_score: PRINTS_1123[slug] },
      // Newest print is a decoy. An as-of helper that reads "latest" fails.
      {
        week_of: LATER,
        bpi_score: slug === "austin-tx" ? 1 : slug === "seattle-wa" ? 100 : PRINTS_1123[slug],
      },
    ],
  }));
}

describe("buildPurchasingPowerBriefForWeek", () => {
  it("matches the Nov 23 2026 print: Seattle leads, New Orleans is toughest", () => {
    const brief = buildPurchasingPowerBriefForWeek(liveCities(), `${WEEK}T00:00:00.000Z`);
    assert.ok(brief);
    assert.equal(brief.weekOf, WEEK);
    assert.deepEqual(
      brief.best.map((city) => city.slug),
      ["seattle-wa"],
    );
    assert.equal(brief.best[0].minWage, 21.3);
    assert.equal(brief.best[0].bpi, 14.41);
    assert.equal(brief.best[0].burgersPerHour, burgersPerHour(21.3, 14.41));
    assert.equal(brief.best[0].burgersPerHour.toFixed(1), "1.5");
    assert.deepEqual(
      brief.toughest.map((city) => city.slug),
      ["new-orleans-la"],
    );
    assert.equal(brief.toughest[0].minWage, 7.25);
    assert.equal(brief.toughest[0].bpi, 12.55);
    assert.equal(brief.toughest[0].burgersPerHour, burgersPerHour(7.25, 12.55));
    assert.equal(brief.toughest[0].burgersPerHour.toFixed(1), "0.6");

    const wages = getAllWages();
    const board = buildPurchasingPowerBoard(
      Object.entries(PRINTS_1123).map(([slug, bpi]) => ({
        slug,
        name: wages[slug].city,
        state: wages[slug].state,
        bpi,
        weekOf: WEEK,
      })),
      { weekOf: WEEK },
    );
    assert.ok(board);
    assert.equal(board[0].slug, "seattle-wa");
    assert.deepEqual(
      board.slice(-3).map((row) => [row.slug, row.minWage, row.burgersPerHour]),
      [
        ["nashville-tn", 7.25, burgersPerHour(7.25, PRINTS_1123["nashville-tn"])],
        ["austin-tx", 7.25, burgersPerHour(7.25, PRINTS_1123["austin-tx"])],
        ["new-orleans-la", 7.25, burgersPerHour(7.25, PRINTS_1123["new-orleans-la"])],
      ],
    );

    const lines = formatPurchasingPowerBrief(brief);
    assert.equal(
      lines.best,
      "Best value: Seattle, 1.5 burgers per hour of minimum wage ($21.30/hr).",
    );
    assert.equal(lines.toughest, "Toughest: New Orleans, 0.6 burgers/hr at $7.25/hr.");
    const tokens = purchasingPowerBriefTokens(brief);
    assert.deepEqual(citySlugs(tokens.best), ["seattle-wa"]);
    assert.deepEqual(citySlugs(tokens.toughest), ["new-orleans-la"]);
  });

  it("uses the edition week, not a later print", () => {
    const brief = buildPurchasingPowerBriefForWeek(liveCities(), PRIOR);
    assert.ok(brief);
    assert.equal(brief.best[0].slug, "seattle-wa");
    assert.equal(brief.best[0].bpi, 14.98);
    assert.equal(brief.best[0].burgersPerHour, burgersPerHour(21.3, 14.98));
    assert.equal(brief.best[0].burgersPerHour.toFixed(1), "1.4");
    assert.equal(brief.toughest[0].slug, "new-orleans-la");
    assert.equal(brief.toughest[0].burgersPerHour, burgersPerHour(7.25, 12.75));
    assert.equal(
      formatPurchasingPowerBrief(brief).best,
      "Best value: Seattle, 1.4 burgers per hour of minimum wage ($21.30/hr).",
    );

    const decoy = buildPurchasingPowerBriefForWeek(liveCities(), LATER);
    assert.equal(decoy?.best[0].slug, "austin-tx");
    assert.notEqual(decoy?.best[0].slug, "seattle-wa");
  });

  it("does not treat a 1-decimal display tie as a tie", () => {
    const brief = buildPurchasingPowerBriefForWeek(
      [
        weekCity("portland-or", "Portland", { [WEEK]: 10 }),
        weekCity("chicago-il", "Chicago", { [WEEK]: 10 }),
        weekCity("boston-ma", "Boston", { [WEEK]: 18.75 }),
      ],
      WEEK,
      WAGES,
    );
    assert.ok(brief);
    assert.equal(brief.best[0].burgersPerHour, 1.22);
    assert.equal(brief.best[0].burgersPerHour.toFixed(1), "1.2");
    assert.deepEqual(
      brief.best.map((city) => city.slug),
      ["portland-or"],
    );
    assert.equal(
      formatPurchasingPowerBrief(brief).best,
      "Best value: Portland, 1.2 burgers per hour of minimum wage ($12.20/hr).",
    );
    assert.equal(brief.toughest[0].slug, "boston-ma");
  });

  it("lists every city tied on the 2-decimal rate, name then slug", () => {
    const brief = buildPurchasingPowerBriefForWeek(
      [
        weekCity("tie-b", "Portland", { [WEEK]: 10 }),
        weekCity("tie-c", "Chicago", { [WEEK]: 10 }),
        weekCity("tie-a", "Chicago", { [WEEK]: 10 }),
        weekCity("low", "Austin", { [WEEK]: 20 }),
      ],
      WEEK,
      WAGES,
    );
    assert.ok(brief);
    assert.deepEqual(
      brief.best.map((city) => city.slug),
      ["tie-a", "tie-c", "tie-b"],
    );
    assert.deepEqual(citySlugs(purchasingPowerBriefTokens(brief).best), [
      "tie-a",
      "tie-c",
      "tie-b",
    ]);
    assert.equal(
      formatPurchasingPowerBrief(brief).best,
      "Best value: Chicago, Chicago, and Portland, 1.0 burgers per hour of minimum wage ($10.00/hr).",
    );
    assert.equal(
      formatPurchasingPowerBrief(brief).toughest,
      "Toughest: Austin, 0.5 burgers/hr at $10.00/hr.",
    );
  });

  it("lists a shared-wage tie on the bottom in name order", () => {
    const brief = buildPurchasingPowerBriefForWeek(
      [
        weekCity("seattle-wa", "Seattle", { [WEEK]: 10 }),
        weekCity("new-orleans-la", "New Orleans", { [WEEK]: 14.5 }),
        weekCity("nashville-tn", "Nashville", { [WEEK]: 14.5 }),
        weekCity("austin-tx", "Austin", { [WEEK]: 14.5 }),
      ],
      WEEK,
      {
        "seattle-wa": { min_wage: 21.3, source: "city" },
        "austin-tx": { min_wage: 7.25, source: "federal" },
        "nashville-tn": { min_wage: 7.25, source: "federal" },
        "new-orleans-la": { min_wage: 7.25, source: "federal" },
      },
    );
    assert.ok(brief);
    assert.deepEqual(
      brief.toughest.map((city) => city.slug),
      ["austin-tx", "nashville-tn", "new-orleans-la"],
    );
    assert.equal(
      formatPurchasingPowerBrief(brief).toughest,
      "Toughest: Austin, Nashville, and New Orleans, 0.5 burgers/hr at $7.25/hr.",
    );
  });

  it("names each wage when a tie does not share one", () => {
    const brief = buildPurchasingPowerBriefForWeek(
      [
        weekCity("seattle-wa", "Seattle", { [WEEK]: 10 }),
        weekCity("austin-tx", "Austin", { [WEEK]: 5 }),
        weekCity("boston-ma", "Boston", { [WEEK]: 18.75 }),
      ],
      WEEK,
      WAGES,
    );
    assert.ok(brief);
    assert.deepEqual(
      brief.best.map((city) => city.slug),
      ["austin-tx", "seattle-wa"],
    );
    assert.equal(
      formatPurchasingPowerBrief(brief).best,
      "Best value: Austin ($10.00/hr) and Seattle ($20.00/hr), tied at 2.0 burgers per hour of minimum wage.",
    );
    assert.equal(
      formatPurchasingPowerBrief(brief).toughest,
      "Toughest: Boston, 0.8 burgers/hr at $15.00/hr.",
    );
  });

  it("drops the toughest line when every city shares one rate", () => {
    const brief = buildPurchasingPowerBriefForWeek(
      [
        weekCity("seattle-wa", "Seattle", { [WEEK]: 10 }),
        weekCity("boston-ma", "Boston", { [WEEK]: 10 }),
      ],
      WEEK,
      {
        "seattle-wa": { min_wage: 10, source: "city" },
        "boston-ma": { min_wage: 10, source: "state" },
      },
    );
    assert.ok(brief);
    assert.equal(brief.best.length, 2);
    assert.equal(brief.toughest.length, 2);
    const lines = formatPurchasingPowerBrief(brief);
    assert.equal(
      lines.best,
      "Best value: Boston and Seattle, 1.0 burgers per hour of minimum wage ($10.00/hr).",
    );
    assert.equal(lines.toughest, null);
  });

  it("returns null when the week cannot rank two cities", () => {
    const ranked = [
      weekCity("seattle-wa", "Seattle", { [WEEK]: 10 }),
      weekCity("boston-ma", "Boston", { [WEEK]: 18.75 }),
    ];
    assert.equal(buildPurchasingPowerBriefForWeek([], WEEK, WAGES), null);
    assert.equal(buildPurchasingPowerBriefForWeek(ranked, "not-a-week", WAGES), null);
    assert.equal(buildPurchasingPowerBriefForWeek(ranked, "", WAGES), null);
    assert.equal(
      buildPurchasingPowerBriefForWeek([ranked[0]], WEEK, WAGES),
      null,
    );
    assert.equal(
      buildPurchasingPowerBriefForWeek(
        [
          weekCity("seattle-wa", "Seattle", { [WEEK]: 0 }),
          weekCity("boston-ma", "Boston", { [WEEK]: null }),
        ],
        WEEK,
        WAGES,
      ),
      null,
    );
    assert.equal(
      buildPurchasingPowerBriefForWeek(
        [
          weekCity("no-wage", "Nowhere", { [WEEK]: 10 }),
          weekCity("also-none", "Also", { [WEEK]: 12 }),
        ],
        WEEK,
        WAGES,
      ),
      null,
    );
    assert.equal(
      buildPurchasingPowerBriefForWeek(ranked, "2026-10-26", WAGES),
      null,
    );
    assert.equal(
      buildPurchasingPowerBriefForWeek(
        [
          weekCity("seattle-wa", "Seattle", { [WEEK]: 10 }),
          weekCity("boston-ma", "Boston", { [LATER]: 18.75 }),
        ],
        WEEK,
        WAGES,
      ),
      null,
    );
  });

  it("keeps the first slug and the later row on that week", () => {
    const brief = buildPurchasingPowerBriefForWeek(
      [
        {
          city: { slug: "seattle-wa", name: "Seattle", state: "WA" },
          history: [
            { week_of: WEEK, bpi_score: 100 },
            { week_of: `${WEEK}T08:00:00.000Z`, bpi_score: 10 },
            { week_of: WEEK, bpi_score: Number.NaN },
          ],
        },
        weekCity("seattle-wa", "Decoy", { [WEEK]: 1 }),
        weekCity("boston-ma", "Boston", { [WEEK]: 18.75 }),
      ],
      WEEK,
      WAGES,
    );
    assert.ok(brief);
    assert.equal(brief.best[0].name, "Seattle");
    assert.equal(brief.best[0].state, "WA");
    assert.equal(brief.best[0].bpi, 10);
    assert.equal(brief.best[0].burgersPerHour, 2);
  });
});
