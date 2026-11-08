import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBoardShakeup,
  buildBoardShakeupForWeek,
} from "./rank-ladder.ts";
import {
  buildNewsletterCaption,
  newsletterRankShareClause,
  newsletterShareUrl,
} from "./share.ts";
import type { BpiSnapshot, CityDashboardData } from "./types.ts";

/**
 * Real city prints around the week of 2026-11-02 (public BPI history).
 * 2026-10-26 is a gap and is absent. 2026-11-09 is a later decoy print so a
 * helper that reads currentSnapshot instead of the requested week fails.
 */
const PRINTS: Record<string, Record<string, number>> = {
  "2026-10-12": {
    "new-york-ny": 20.89,
    "san-francisco-ca": 16.5,
    "boston-ma": 16.12,
    "los-angeles-ca": 15.58,
    "seattle-wa": 15.16,
    "chicago-il": 15.05,
    "new-orleans-la": 12.58,
    "nashville-tn": 12.11,
    "portland-or": 11.62,
    "austin-tx": 9.57,
  },
  "2026-10-19": {
    "new-york-ny": 20.12,
    "san-francisco-ca": 17.81,
    "los-angeles-ca": 16.73,
    "boston-ma": 15.42,
    "seattle-wa": 14.71,
    "chicago-il": 13.71,
    "portland-or": 13.54,
    "austin-tx": 13.51,
    "new-orleans-la": 13.13,
    "nashville-tn": 12.68,
  },
  "2026-11-02": {
    "new-york-ny": 19.59,
    "san-francisco-ca": 16.64,
    "boston-ma": 16.46,
    "los-angeles-ca": 15.65,
    "seattle-wa": 14.69,
    "chicago-il": 13.48,
    "new-orleans-la": 12.55,
    "nashville-tn": 11.24,
    "austin-tx": 11,
    "portland-or": 10.77,
  },
  "2026-11-09": {
    "portland-or": 40,
    "new-york-ny": 20,
    "san-francisco-ca": 19,
    "boston-ma": 18,
    "los-angeles-ca": 17,
    "seattle-wa": 16,
    "chicago-il": 15,
    "nashville-tn": 14,
    "austin-tx": 13,
    "new-orleans-la": 12,
  },
};

const CITIES: { slug: string; name: string; state: string }[] = [
  { slug: "austin-tx", name: "Austin", state: "TX" },
  { slug: "boston-ma", name: "Boston", state: "MA" },
  { slug: "chicago-il", name: "Chicago", state: "IL" },
  { slug: "los-angeles-ca", name: "Los Angeles", state: "CA" },
  { slug: "nashville-tn", name: "Nashville", state: "TN" },
  { slug: "new-orleans-la", name: "New Orleans", state: "LA" },
  { slug: "new-york-ny", name: "New York", state: "NY" },
  { slug: "portland-or", name: "Portland", state: "OR" },
  { slug: "san-francisco-ca", name: "San Francisco", state: "CA" },
  { slug: "seattle-wa", name: "Seattle", state: "WA" },
];

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
    sample_size: 10,
    raw_prices: [],
    created_at: `${week}T00:00:00.000Z`,
  };
}

/** History is newest-first on purpose; current/previous are the latest pair. */
function board(): CityDashboardData[] {
  const weeks = ["2026-11-09", "2026-11-02", "2026-10-19", "2026-10-12"];
  return CITIES.map((city) => {
    const history = weeks.map((week) => snapshot(city.slug, week, PRINTS[week][city.slug]));
    return {
      city: { id: city.slug, ...city, lat: null, lng: null },
      currentSnapshot: history[0],
      previousSnapshot: history[1],
      spotlight: null,
      history,
    };
  });
}

describe("newsletter board shakeup", () => {
  const cities = board();

  it("reads 2026-11-02 vs the Oct 19 print, skipping the Oct 26 gap and the later decoy", () => {
    const live = buildBoardShakeup(cities);
    assert.equal(live?.climber?.slug, "portland-or");
    assert.equal(live?.prevWeekOf, "2026-11-02");

    const shakeup = buildBoardShakeupForWeek(cities, "2026-11-02");
    assert.ok(shakeup);
    assert.equal(shakeup.prevWeekOf, "2026-10-19");
    assert.equal(shakeup.total, 10);
    assert.equal(shakeup.held, 4);
    assert.deepEqual(shakeup.climber, {
      slug: "new-orleans-la",
      name: "New Orleans",
      state: "LA",
      rank: 7,
      prevRank: 9,
      spots: 2,
    });
    assert.deepEqual(shakeup.slider, {
      slug: "portland-or",
      name: "Portland",
      state: "OR",
      rank: 10,
      prevRank: 7,
      spots: 3,
    });

    const line = newsletterRankShareClause(shakeup);
    assert.equal(line, "New Orleans climbed 2 to #7 and Portland slid 3 to #10.");
    const caption = buildNewsletterCaption({
      weekOf: "2026-11-02",
      headline: "The bun is a leading indicator",
      rankLine: line,
    });
    assert.equal(
      caption,
      `BPI Weekly — week of Nov 2, 2026: "The bun is a leading indicator" New Orleans climbed 2 to #7 and Portland slid 3 to #10. The tape doesn't care about your feelings. Read the print: ${newsletterShareUrl("2026-11-02")}`,
    );
  });

  it("omits the rank line when the caption has nothing to add", () => {
    const plain = buildNewsletterCaption({
      weekOf: "2026-11-02",
      headline: "Flat tape",
    });
    assert.equal(
      plain,
      `BPI Weekly — week of Nov 2, 2026: "Flat tape" The tape doesn't care about your feelings. Read the print: ${newsletterShareUrl("2026-11-02")}`,
    );
    assert.equal(newsletterRankShareClause(null), null);
  });

  it("returns null when the edition week has no prior print or is missing", () => {
    assert.equal(buildBoardShakeupForWeek(cities, "2026-10-12"), null);
    assert.equal(buildBoardShakeupForWeek(cities, "2026-10-26"), null);
    assert.equal(newsletterRankShareClause(null), null);
  });

  it("returns null when the prior board is a different size", () => {
    const broken = board().map((c) =>
      c.city.slug === "austin-tx"
        ? { ...c, history: c.history.filter((s) => s.week_of === "2026-11-02") }
        : c,
    );
    assert.equal(buildBoardShakeupForWeek(broken, "2026-11-02"), null);
  });

  it("keeps a flat board quiet in the share caption", () => {
    const weeks = ["2026-11-02", "2026-10-19"];
    const flat: CityDashboardData[] = ["alpha", "beta"].map((slug, i) => {
      const history = weeks.map((week) => snapshot(slug, week, 20 - i));
      return {
        city: { id: slug, name: slug, state: "XX", slug, lat: null, lng: null },
        currentSnapshot: history[0],
        previousSnapshot: history[1],
        spotlight: null,
        history,
      };
    });
    const shakeup = buildBoardShakeupForWeek(flat, "2026-11-02");
    assert.ok(shakeup);
    assert.equal(shakeup.climber, null);
    assert.equal(shakeup.slider, null);
    assert.equal(shakeup.held, 2);
    assert.equal(shakeup.total, 2);
    assert.equal(shakeup.prevWeekOf, "2026-10-19");
    assert.equal(newsletterRankShareClause(shakeup), null);
  });
});
