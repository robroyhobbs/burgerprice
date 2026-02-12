import type { RawPrice } from "./types";

const CATEGORY_WEIGHTS: Record<RawPrice["category"], number> = {
  fast_food: 0.2,
  casual: 0.4,
  premium: 0.4,
};

/**
 * Calculate the Burger Price Index (weighted average).
 * Weights: fast_food 20%, casual 40%, premium 40%.
 * Prices outside $1-$50 are filtered as outliers.
 */
export function calculateBpi(prices: RawPrice[]): number {
  // Filter outliers
  const valid = prices.filter((p) => p.price >= 1 && p.price <= 50);
  if (valid.length === 0) return 0;

  // Group by category
  const groups: Record<string, number[]> = {};
  for (const p of valid) {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p.price);
  }

  const categories = Object.keys(groups);
  if (categories.length === 0) return 0;

  // If some categories are missing, redistribute weights proportionally
  const totalWeight = categories.reduce(
    (sum, cat) => sum + (CATEGORY_WEIGHTS[cat as RawPrice["category"]] ?? 0),
    0
  );

  let weightedSum = 0;
  for (const cat of categories) {
    const avg =
      groups[cat].reduce((s, p) => s + p, 0) / groups[cat].length;
    const weight =
      (CATEGORY_WEIGHTS[cat as RawPrice["category"]] ?? 0) / totalWeight;
    weightedSum += avg * weight;
  }

  return Math.round(weightedSum * 100) / 100;
}

/**
 * Calculate week-over-week change percentage.
 * Returns null if there's no previous value.
 */
export function calculateChange(
  current: number,
  previous: number | null
): number | null {
  if (previous === null || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 10) / 10;
}

/**
 * Find cheapest and most expensive burgers from raw prices.
 */
export function findExtremes(prices: RawPrice[]) {
  const valid = prices.filter((p) => p.price >= 1 && p.price <= 50);
  if (valid.length === 0) {
    return {
      cheapest: { price: 0, restaurant: "N/A" },
      mostExpensive: { price: 0, restaurant: "N/A" },
    };
  }

  const sorted = [...valid].sort((a, b) => a.price - b.price);
  return {
    cheapest: {
      price: sorted[0].price,
      restaurant: sorted[0].restaurant,
    },
    mostExpensive: {
      price: sorted[sorted.length - 1].price,
      restaurant: sorted[sorted.length - 1].restaurant,
    },
  };
}
