export interface City {
  id: string;
  name: string;
  state: string;
  slug: string;
  lat: number | null;
  lng: number | null;
}

export interface CityRequest {
  id: string;
  city: string;
  state: string;
  request_count: number;
  status: "pending" | "approved" | "rejected";
}

export interface RawPrice {
  restaurant: string;
  burger: string;
  price: number;
  source: string;
  category: "fast_food" | "casual" | "premium";
  website?: string | null;
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

export interface IndustryNewsItem {
  id: string;
  week_of: string;
  title: string;
  summary: string;
  category: string;
  source: string | null;
  impact: "bullish" | "bearish" | "neutral";
  created_at?: string;
}

// Newsletter types
export interface NewsletterTapeMover {
  city: string;
  direction: "up" | "down";
  changePct: number;
  commentary: string;
}

export interface NewsletterContent {
  headline: string;
  marketOverview: string;
  theTape: NewsletterTapeMover[];
  citySpotlight: {
    city: string;
    narrative: string;
  };
  burgerOfTheWeek: {
    restaurant: string;
    burger: string;
    city: string;
    price: number;
    review: string;
  };
  theSpread: {
    cheapest: { restaurant: string; city: string; price: number };
    mostExpensive: { restaurant: string; city: string; price: number };
    commentary: string;
  };
  analystsCorner: {
    title: string;
    essay: string;
  };
}

export interface NewsletterEdition {
  id: string;
  week_of: string;
  headline: string;
  sections: NewsletterContent;
  created_at: string;
}

// National BPI data point
export interface NationalBpiPoint {
  week_of: string;
  avg_bpi: number;
  city_count: number;
}

// Purchasing power entry
export interface PurchasingPowerEntry {
  city: string;
  state: string;
  slug: string;
  min_wage: number;
  avg_bpi: number;
  burgers_per_hour: number;
}

// The Spread entry
export interface SpreadEntry {
  city: string;
  state: string;
  restaurant: string;
  price: number;
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
  news: IndustryNewsItem[];
  weekOf: string;
}
