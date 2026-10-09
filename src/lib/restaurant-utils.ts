/**
 * Get a URL for a restaurant — returns the website if valid, otherwise a Google Maps search link.
 */
export function getRestaurantUrl(
  name: string,
  city: string,
  state: string,
  website?: string | null,
): string {
  if (
    website &&
    (website.startsWith("https://") || website.startsWith("http://"))
  ) {
    return website;
  }

  return `https://www.google.com/maps/search/${encodeURIComponent(name + " " + city + " " + state)}`;
}

export type PriceTier = "fast_food" | "casual" | "premium";

export interface PriceTierSummary {
  tier: PriceTier;
  label: string;
  count: number;
  low: number;
  high: number;
  avg: number;
}

const TIER_LABELS: Record<PriceTier, string> = {
  fast_food: "Fast food",
  casual: "Casual",
  premium: "Premium",
};

/**
 * Per-tier low / average / high for one city's sampled burgers this week.
 * Tiers with no samples are omitted; order is fast food, casual, premium.
 */
export function summarizePriceTiers(
  prices: { price: number; category: string }[],
): PriceTierSummary[] {
  const tiers: PriceTier[] = ["fast_food", "casual", "premium"];
  return tiers.flatMap((tier) => {
    const vals = prices
      .filter((p) => p.category === tier && Number.isFinite(p.price) && p.price > 0)
      .map((p) => p.price);
    if (vals.length === 0) return [];
    const sum = vals.reduce((a, b) => a + b, 0);
    return [
      {
        tier,
        label: TIER_LABELS[tier],
        count: vals.length,
        low: Math.min(...vals),
        high: Math.max(...vals),
        avg: Math.round((sum / vals.length) * 100) / 100,
      },
    ];
  });
}
