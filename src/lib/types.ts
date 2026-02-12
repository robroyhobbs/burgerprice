export interface City {
  id: string;
  name: string;
  state: string;
  slug: string;
}

export interface RawPrice {
  restaurant: string;
  burger: string;
  price: number;
  source: string;
  category: "fast_food" | "casual" | "premium";
}

export interface BpiSnapshot {
  id: string;
  city_id: string;
  week_of: string;
  bpi_score: number;
  change_pct: number | null;
  cheapest_price: number;
  cheapest_restaurant: string;
  most_expensive_price: number;
  most_expensive_restaurant: string;
  avg_price: number;
  sample_size: number;
  raw_prices: RawPrice[];
  created_at: string;
}

export interface BurgerSpotlight {
  id: string;
  city_id: string;
  week_of: string;
  restaurant_name: string;
  burger_name: string;
  price: number;
  description: string;
  image_url?: string;
}

export interface MarketFactor {
  factor: string;
  impact: "up" | "down" | "neutral";
  description: string;
}

export interface MarketReport {
  id: string;
  week_of: string;
  headline: string;
  summary: string;
  factors: MarketFactor[];
}

export interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
}

// Combined data for the dashboard
export interface CityDashboardData {
  city: City;
  currentSnapshot: BpiSnapshot | null;
  previousSnapshot: BpiSnapshot | null;
  spotlight: BurgerSpotlight | null;
  history: BpiSnapshot[];
}

export interface DashboardData {
  cities: CityDashboardData[];
  latestReport: MarketReport | null;
  weekOf: string;
}
