/**
 * City-level minimum wage data (2026).
 *
 * Sources:
 * - State rates: US Dept of Labor / BLS
 * - City rates: Individual city ordinances
 *
 * Update frequency: 1-2x per year (most adjust Jan 1 or Jul 1).
 * Last updated: Feb 2026
 */

interface WageEntry {
  city: string;
  state: string;
  min_wage: number;
  source: "city" | "state" | "federal";
  note?: string;
}

const MINIMUM_WAGES: Record<string, WageEntry> = {
  "new-york-ny": {
    city: "New York",
    state: "NY",
    min_wage: 17.0,
    source: "city",
    note: "NYC rate, upstate NY is $16.00",
  },
  "los-angeles-ca": {
    city: "Los Angeles",
    state: "CA",
    min_wage: 17.87,
    source: "city",
    note: "CPI-adjusted annually",
  },
  "chicago-il": {
    city: "Chicago",
    state: "IL",
    min_wage: 16.6,
    source: "city",
    note: "4+ employees",
  },
  "san-francisco-ca": {
    city: "San Francisco",
    state: "CA",
    min_wage: 16.99,
    source: "city",
    note: "CPI-adjusted annually",
  },
  "seattle-wa": {
    city: "Seattle",
    state: "WA",
    min_wage: 21.3,
    source: "city",
    note: "Highest city rate in the US",
  },
  "boston-ma": {
    city: "Boston",
    state: "MA",
    min_wage: 15.0,
    source: "state",
  },
  "austin-tx": {
    city: "Austin",
    state: "TX",
    min_wage: 7.25,
    source: "federal",
    note: "TX state preemption law",
  },
  "nashville-tn": {
    city: "Nashville",
    state: "TN",
    min_wage: 7.25,
    source: "federal",
    note: "TN state preemption law",
  },
  "portland-or": {
    city: "Portland",
    state: "OR",
    min_wage: 15.45,
    source: "city",
    note: "Portland metro area rate",
  },
  "new-orleans-la": {
    city: "New Orleans",
    state: "LA",
    min_wage: 7.25,
    source: "federal",
  },
};

export function getMinimumWage(citySlug: string): WageEntry | null {
  return MINIMUM_WAGES[citySlug] ?? null;
}

export function getAllWages(): Record<string, WageEntry> {
  return { ...MINIMUM_WAGES };
}
