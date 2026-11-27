import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";
import type { PowerCity, WageTable } from "./purchasing-power-rank.ts";

register(new URL("./ts-resolve-hook.mjs", import.meta.url));

const {
  PURCHASING_POWER_BOARD_QUESTION,
  buildPurchasingPowerBoard,
  buildPurchasingPowerBoardFaq,
  buildPurchasingPowerFaq,
  buildPurchasingPowerRank,
  burgersPerHour,
  compareByBurgersPerHour,
} = await import("./purchasing-power-rank.ts");
const { getAllWages } = await import("./wages.ts");
const { buildCityFaqItems, buildFaqPageJsonLd } = await import("./json-ld.ts");

const WEEK = "2026-11-23";

const WAGES: WageTable = {
  "seattle-wa": { min_wage: 20, source: "city" },
  "portland-or": { min_wage: 12.2, source: "city" },
  "chicago-il": { min_wage: 12.1, source: "city" },
  "boston-ma": { min_wage: 15, source: "state" },
  "austin-tx": { min_wage: 10, source: "federal" },
  "tie-a": { min_wage: 10, source: "city" },
  "tie-b": { min_wage: 10, source: "city" },
};

function city(
  slug: string,
  name: string,
  bpi: number | null,
  weekOf: string | null = WEEK,
): PowerCity {
  return { slug, name, bpi, weekOf };
}

/** BPI chosen so wage/BPI rounds to the rate in the name of each case. */
const BOARD: PowerCity[] = [
  city("seattle-wa", "Seattle", 10), // 20/10 = 2.00 → 2.0
  city("portland-or", "Portland", 10), // 12.2/10 = 1.22 → 1.2
  city("chicago-il", "Chicago", 10), // 12.1/10 = 1.21 → 1.2
  city("boston-ma", "Boston", 18.75), // 15/18.75 = 0.80 → 0.8
  city("austin-tx", "Austin", 20), // 10/20 = 0.50 → 0.5
];

describe("burgersPerHour", () => {
  it("rounds wage / BPI to two decimals, and rejects a non-positive BPI", () => {
    assert.equal(burgersPerHour(21.3, 14.41), 1.48);
    assert.equal(burgersPerHour(15, 18.36), 0.82);
    assert.equal(burgersPerHour(17, 21.84), 0.78);
    assert.equal(burgersPerHour(15.45, 12.66), 1.22);
    assert.equal(burgersPerHour(16.6, 13.68), 1.21);
    assert.equal(burgersPerHour(10, 0), null);
    assert.equal(burgersPerHour(10, -1), null);
    assert.equal(burgersPerHour(Number.NaN, 10), null);
  });
});

describe("buildPurchasingPowerRank", () => {
  it("ranks by the two-decimal rate, so a 1.2 display tie does not tie the board", () => {
    const portland = buildPurchasingPowerRank(BOARD, "portland-or", WAGES);
    const chicago = buildPurchasingPowerRank(BOARD, "chicago-il", WAGES);
    assert.ok(portland);
    assert.ok(chicago);
    assert.equal(portland.burgersPerHour, 1.22);
    assert.equal(chicago.burgersPerHour, 1.21);
    assert.equal(portland.burgersPerHour.toFixed(1), "1.2");
    assert.equal(chicago.burgersPerHour.toFixed(1), "1.2");
    assert.equal(portland.rank, 2);
    assert.equal(chicago.rank, 3);
    assert.equal(portland.total, 5);
    assert.equal(
      chicago.rankLine,
      "#3 of 5 for purchasing power (most burgers per hour first). Seattle leads at 2.0 burgers/hr.",
    );
    assert.equal(compareByBurgersPerHour(portland, chicago) < 0, true);
  });

  it("breaks an exact rate tie by city name, then slug, without sharing a rank", () => {
    const tied: PowerCity[] = [
      city("tie-b", "Portland", 10),
      city("tie-a", "Chicago", 10),
      city("tie-c", "Chicago", 10),
    ];
    const wages: WageTable = {
      "tie-b": { min_wage: 10, source: "city" },
      "tie-a": { min_wage: 10, source: "city" },
      "tie-c": { min_wage: 10, source: "state" },
    };
    const first = buildPurchasingPowerRank(tied, "tie-a", wages);
    const sameName = buildPurchasingPowerRank(tied, "tie-c", wages);
    const second = buildPurchasingPowerRank(tied, "tie-b", wages);
    assert.equal(first?.rank, 1);
    assert.equal(first?.burgersPerHour, 1);
    assert.equal(sameName?.rank, 2);
    assert.equal(second?.rank, 3);
    assert.equal(
      first?.rankLine,
      "#1 of 3 for purchasing power (most burgers per hour first). Chicago leads; Chicago is next at 1.0 burgers/hr.",
    );
    assert.equal(
      second?.rankLine,
      "#3 of 3 for purchasing power (most burgers per hour first). Chicago leads at 1.0 burgers/hr.",
    );
    assert.equal(sameName?.runnerUpName, "Chicago");
    assert.equal(sameName?.slug, "tie-c");
  });

  it("says the city leads and names the runner-up when it is #1", () => {
    const seattle = buildPurchasingPowerRank(BOARD, "seattle-wa", WAGES);
    assert.ok(seattle);
    assert.equal(seattle.rank, 1);
    assert.equal(seattle.leaderName, "Seattle");
    assert.equal(seattle.runnerUpName, "Portland");
    assert.equal(seattle.runnerUpBurgersPerHour, 1.22);
    assert.equal(
      seattle.rankLine,
      "#1 of 5 for purchasing power (most burgers per hour first). Seattle leads; Portland is next at 1.2 burgers/hr.",
    );
  });

  it("names only itself when it is the sole city on the board", () => {
    const alone = buildPurchasingPowerRank(
      [city("seattle-wa", "Seattle", 10)],
      "seattle-wa",
      WAGES,
    );
    assert.equal(
      alone?.rankLine,
      "#1 of 1 for purchasing power (most burgers per hour first). Seattle leads at 2.0 burgers/hr.",
    );
    assert.equal(alone?.runnerUpName, null);
  });

  it("returns null when wage data is missing, or BPI cannot be divided", () => {
    assert.equal(
      buildPurchasingPowerRank(BOARD, "denver-co", WAGES),
      null,
    );
    assert.equal(
      buildPurchasingPowerRank(
        [city("seattle-wa", "Seattle", null)],
        "seattle-wa",
        WAGES,
      ),
      null,
    );
    assert.equal(
      buildPurchasingPowerRank(
        [city("seattle-wa", "Seattle", 0)],
        "seattle-wa",
        WAGES,
      ),
      null,
    );
    const noWage = buildPurchasingPowerFaq(
      [city("mystery-city", "Mystery", 12)],
      "mystery-city",
    );
    assert.equal(noWage, null);
  });

  it("ranks only the subject's week, and skips cities with no wage", () => {
    const mixed: PowerCity[] = [
      city("seattle-wa", "Seattle", 10, WEEK),
      city("portland-or", "Portland", 5, "2026-11-16"),
      city("chicago-il", "Chicago", 10, WEEK),
      city("no-wage", "Denver", 1, WEEK),
    ];
    const seattle = buildPurchasingPowerRank(mixed, "seattle-wa", WAGES);
    assert.equal(seattle?.total, 2);
    assert.equal(seattle?.rank, 1);
    assert.equal(seattle?.runnerUpName, "Chicago");
    assert.equal(
      buildPurchasingPowerRank(mixed, "portland-or", WAGES)?.total,
      1,
    );
  });

  it("reads the shared wage table when no table is passed", () => {
    const liveShape: PowerCity[] = [
      city("boston-ma", "Boston", 18.36),
      city("seattle-wa", "Seattle", 14.41),
      city("new-york-ny", "New York", 21.84),
    ];
    const boston = buildPurchasingPowerFaq(liveShape, "boston-ma");
    assert.ok(boston);
    assert.equal(
      boston.q,
      "How many burgers can an hour of minimum wage buy in Boston?",
    );
    assert.match(
      boston.a,
      /^\$15\.00\/hr state min wage, BPI \$18\.36, 0\.8 burgers\/hr\. #2 of 3 for purchasing power \(most burgers per hour first\)\. Seattle leads at 1\.5 burgers\/hr\.$/,
    );
    const seattle = buildPurchasingPowerRank(liveShape, "seattle-wa");
    assert.equal(seattle?.wageSource, "city");
    assert.equal(seattle?.minWage, 21.3);
    assert.match(seattle?.rankLine ?? "", /Seattle leads; Boston is next at 0\.8/);
  });
});

describe("buildPurchasingPowerFaq", () => {
  it("states wage, source, BPI, burgers/hr, and the rank line", () => {
    const faq = buildPurchasingPowerFaq(BOARD, "boston-ma", WAGES);
    const rank = buildPurchasingPowerRank(BOARD, "boston-ma", WAGES);
    assert.ok(faq);
    assert.ok(rank);
    assert.equal(
      faq.q,
      "How many burgers can an hour of minimum wage buy in Boston?",
    );
    assert.equal(
      faq.a,
      `$15.00/hr state min wage, BPI $18.75, 0.8 burgers/hr. ${rank.rankLine}`,
    );
    assert.equal(faq.a.includes("!"), false);
    assert.equal(
      buildPurchasingPowerFaq(BOARD, "austin-tx", WAGES)?.a.startsWith(
        "$10.00/hr federal min wage, BPI $20.00, 0.5 burgers/hr. ",
      ),
      true,
    );
  });

  it("omits the FAQ entry when the wage is missing", () => {
    assert.equal(buildPurchasingPowerFaq(BOARD, "nashville-tn", WAGES), null);
  });
});

function cityFaqContext(
  purchasingPowerCities: PowerCity[] | null,
  history: { week_of: string; bpi_score: number; change_pct: null }[] | null,
) {
  return {
    name: "Portland",
    state: "OR",
    slug: "portland-or",
    bpi: 10,
    changePct: 1.2,
    weekOf: WEEK,
    rank: 4,
    totalCities: 5,
    nationalAvg: 12,
    cheapestRestaurant: "Low",
    cheapestPrice: 4.25,
    mostExpensiveRestaurant: "High",
    mostExpensivePrice: 24,
    sampleSize: 12,
    peerCities: [{ name: "Seattle", state: "WA", bpi: 14.2 }],
    history,
    purchasingPowerCities,
  };
}

const POWER_Q = "How many burgers can an hour of minimum wage buy in Portland?";
const READ_Q = "How do I read Portland's BPI?";
const RECORD_Q =
  "What's Portland's highest and lowest Burger Price Index on record?";
const MOMENTUM_Q =
  "Is Portland's Burger Price Index trending up or down?";

describe("buildCityFaqItems purchasing power", () => {
  it("inserts the entry before the BPI explainer and mirrors it in JSON-LD", () => {
    const items = buildCityFaqItems(cityFaqContext(BOARD, null));
    const questions = items.map((item) => item.q);
    const power = questions.indexOf(POWER_Q);
    const read = questions.indexOf(READ_Q);
    assert.equal(power >= 0, true);
    assert.equal(read, power + 1);
    assert.equal(items[power].a, buildPurchasingPowerFaq(BOARD, "portland-or")?.a);

    const jsonLd = buildFaqPageJsonLd(items);
    const entities = jsonLd.mainEntity as {
      name: string;
      acceptedAnswer: { text: string };
    }[];
    assert.equal(entities[power].name, POWER_Q);
    assert.equal(entities[power].acceptedAnswer.text, items[power].a);
  });

  it("slots the entry after the record question when that question is present", () => {
    const history = [10, 12, 14].map((bpi, i) => ({
      week_of: `2026-11-${String(2 + i * 7).padStart(2, "0")}`,
      bpi_score: bpi,
      change_pct: null,
    }));
    const items = buildCityFaqItems(cityFaqContext(BOARD, history));
    const questions = items.map((item) => item.q);
    assert.equal(questions.indexOf(MOMENTUM_Q), questions.indexOf(RECORD_Q) + 1);
    assert.equal(questions.indexOf(POWER_Q), questions.indexOf(MOMENTUM_Q) + 1);
    assert.equal(questions.indexOf(READ_Q), questions.indexOf(POWER_Q) + 1);
  });
});

describe("buildPurchasingPowerBoard", () => {
  it("ranks most burgers per hour first and matches every city-page rank", () => {
    const rows = buildPurchasingPowerBoard(BOARD, { wages: WAGES, weekOf: WEEK });
    assert.ok(rows);
    assert.deepEqual(
      rows.map((row) => row.slug),
      ["seattle-wa", "portland-or", "chicago-il", "boston-ma", "austin-tx"],
    );
    for (const row of rows) {
      const rank = buildPurchasingPowerRank(BOARD, row.slug, WAGES);
      assert.ok(rank);
      assert.equal(row.rank, rank.rank);
      assert.equal(row.burgersPerHour, rank.burgersPerHour);
      assert.equal(row.minWage, rank.minWage);
      assert.equal(row.bpi, rank.bpi);
      assert.equal(row.wageSource, rank.wageSource);
    }
    assert.equal(rows[0].burgersPerHour.toFixed(1), "2.0");
    const boston = rows.find((row) => row.slug === "boston-ma");
    assert.equal(boston?.rank, 4);
    assert.equal(boston?.burgersPerHour.toFixed(1), "0.8");
    assert.equal(boston?.minWage.toFixed(2), "15.00");
  });

  it("keeps a 1-decimal display tie in two-decimal order", () => {
    const rows = buildPurchasingPowerBoard(BOARD, { wages: WAGES });
    assert.ok(rows);
    const portland = rows.find((row) => row.slug === "portland-or");
    const chicago = rows.find((row) => row.slug === "chicago-il");
    assert.ok(portland);
    assert.ok(chicago);
    assert.equal(portland.burgersPerHour.toFixed(1), "1.2");
    assert.equal(chicago.burgersPerHour.toFixed(1), "1.2");
    assert.equal(portland.rank + 1, chicago.rank);
  });

  it("breaks an exact rate tie by city name, then slug", () => {
    const tied: PowerCity[] = [
      city("tie-b", "Portland", 10),
      city("tie-a", "Chicago", 10),
      city("tie-c", "Chicago", 10),
    ];
    const wages: WageTable = {
      "tie-b": { min_wage: 10, source: "city" },
      "tie-a": { min_wage: 10, source: "city" },
      "tie-c": { min_wage: 10, source: "state" },
    };
    const rows = buildPurchasingPowerBoard(tied, { wages });
    assert.deepEqual(
      rows?.map((row) => row.slug),
      ["tie-a", "tie-c", "tie-b"],
    );
    assert.deepEqual(
      rows?.map((row) => row.rank),
      [1, 2, 3],
    );
  });

  it("omits cities with no wage, no BPI, or a non-positive BPI, and drops duplicate slugs", () => {
    const rows = buildPurchasingPowerBoard(
      [
        city("seattle-wa", "Seattle", 10),
        city("seattle-wa", "Seattle Again", 1),
        city("denver-co", "Denver", 8),
        city("ghost", "Ghost", null),
        city("zero", "Zero", 0),
        city("boston-ma", "Boston", 18.75),
      ],
      {
        wages: {
          ...WAGES,
          zero: { min_wage: 15, source: "state" },
          ghost: { min_wage: 15, source: "city" },
        },
      },
    );
    assert.ok(rows);
    assert.deepEqual(
      rows.map((row) => row.slug),
      ["seattle-wa", "boston-ma"],
    );
    assert.equal(rows[0].name, "Seattle");
    assert.equal(rows[0].burgersPerHour, 2);
  });

  it("returns null when fewer than two cities can be ranked", () => {
    assert.equal(
      buildPurchasingPowerBoard([city("seattle-wa", "Seattle", 10)], {
        wages: WAGES,
      }),
      null,
    );
    assert.equal(
      buildPurchasingPowerBoard(
        [
          city("seattle-wa", "Seattle", null),
          city("boston-ma", "Boston", 0),
        ],
        { wages: WAGES },
      ),
      null,
    );
    assert.equal(
      buildPurchasingPowerBoard(
        [city("no-wage", "Nowhere", 12), city("also-none", "Also", 9)],
        { wages: WAGES },
      ),
      null,
    );
  });

  it("ranks only the requested week, including a timestamp week key", () => {
    const mixed: PowerCity[] = [
      city("seattle-wa", "Seattle", 10, `${WEEK}T00:00:00.000Z`),
      city("portland-or", "Portland", 5, "2026-11-16"),
      city("chicago-il", "Chicago", 10, WEEK),
      city("boston-ma", "Boston", 18.75, WEEK),
      city("austin-tx", "Austin", null, WEEK),
    ];
    const rows = buildPurchasingPowerBoard(mixed, {
      wages: WAGES,
      weekOf: WEEK,
    });
    assert.deepEqual(
      rows?.map((row) => row.slug),
      ["seattle-wa", "chicago-il", "boston-ma"],
    );
    assert.equal(
      buildPurchasingPowerBoard(mixed, { wages: WAGES, weekOf: "2026-11-16" }),
      null,
    );
    const seattle = buildPurchasingPowerRank(mixed, "seattle-wa", WAGES);
    assert.equal(rows?.[0].rank, seattle?.rank);
    assert.equal(rows?.length, seattle?.total);
  });

  it("carries state through and reads the shared wage table", () => {
    const live: PowerCity[] = [
      { ...city("boston-ma", "Boston", 18.36), state: "MA" },
      { ...city("seattle-wa", "Seattle", 14.41), state: "WA" },
      { ...city("new-york-ny", "New York", 21.84), state: "NY" },
    ];
    const rows = buildPurchasingPowerBoard(live, { weekOf: WEEK });
    assert.ok(rows);
    assert.equal(rows[0].slug, "seattle-wa");
    assert.equal(rows[0].state, "WA");
    assert.equal(rows[0].minWage, 21.3);
    assert.equal(rows[0].wageSource, "city");
    assert.equal(rows[0].bpi, 14.41);
    assert.equal(rows[0].burgersPerHour.toFixed(1), "1.5");
    const boston = rows.find((row) => row.slug === "boston-ma");
    assert.ok(boston);
    assert.equal(boston.state, "MA");
    assert.equal(boston.minWage, 15);
    assert.equal(boston.bpi, 18.36);
    assert.equal(boston.burgersPerHour.toFixed(1), "0.8");
    assert.equal(
      boston.rank,
      buildPurchasingPowerRank(live, "boston-ma")?.rank,
    );
  });

  it("agrees with the city-page rank for every city on the shared wage table", () => {
    const wages = getAllWages();
    const slugs = Object.keys(wages);
    assert.equal(slugs.length >= 2, true);
    const cities: PowerCity[] = slugs.map((slug, index) =>
      city(slug, wages[slug].city, 10 + index, WEEK),
    );
    const rows = buildPurchasingPowerBoard(cities, { weekOf: WEEK });
    assert.ok(rows);
    assert.equal(rows.length, slugs.length);
    for (const row of rows) {
      const rank = buildPurchasingPowerRank(cities, row.slug);
      assert.equal(row.rank, rank?.rank);
      assert.equal(row.burgersPerHour, rank?.burgersPerHour);
      assert.equal(row.minWage, wages[row.slug].min_wage);
    }
    assert.equal(rows[0].burgersPerHour >= rows[rows.length - 1].burgersPerHour, true);
  });
});

describe("buildPurchasingPowerBoardFaq", () => {
  it("names the leader with the same rank line the city card prints", () => {
    const rows = buildPurchasingPowerBoard(BOARD, { wages: WAGES, weekOf: WEEK });
    const faq = buildPurchasingPowerBoardFaq(rows);
    const leader = buildPurchasingPowerRank(BOARD, "seattle-wa", WAGES);
    assert.ok(faq);
    assert.ok(leader);
    assert.equal(faq.q, PURCHASING_POWER_BOARD_QUESTION);
    assert.equal(faq.q, "Which city's minimum wage buys the most burgers?");
    assert.equal(
      faq.a,
      `Seattle. $20.00/hr city min wage, BPI $10.00, 2.0 burgers/hr. ${leader.rankLine}`,
    );
    assert.equal(faq.a.includes("!"), false);
  });

  it("stays null when the board is hidden", () => {
    assert.equal(buildPurchasingPowerBoardFaq(null), null);
    assert.equal(
      buildPurchasingPowerBoardFaq(
        buildPurchasingPowerBoard([city("seattle-wa", "Seattle", 10)], {
          wages: WAGES,
        }),
      ),
      null,
    );
  });
});

describe("buildCityFaqItems purchasing power", () => {
  it("drops the entry when wage data is missing and leaves the other questions", () => {
    const items = buildCityFaqItems({
      ...cityFaqContext([city("denver-co", "Denver", 10)], null),
      name: "Denver",
      state: "CO",
      slug: "denver-co",
    });
    assert.equal(
      items.some((item) => item.q.includes("minimum wage")),
      false,
    );
    assert.equal(
      items.some((item) => item.q === "How do I read Denver's BPI?"),
      true,
    );
  });
});
