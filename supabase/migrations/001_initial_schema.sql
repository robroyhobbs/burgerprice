-- Burger Price Index - Initial Schema
-- Run this in Supabase SQL Editor

-- Cities tracked by the index
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly BPI snapshots per city
CREATE TABLE IF NOT EXISTS bpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  week_of DATE NOT NULL,
  bpi_score DECIMAL(6,2) NOT NULL,
  change_pct DECIMAL(5,2),
  cheapest_price DECIMAL(6,2),
  cheapest_restaurant TEXT,
  most_expensive_price DECIMAL(6,2),
  most_expensive_restaurant TEXT,
  avg_price DECIMAL(6,2),
  sample_size INTEGER,
  raw_prices JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city_id, week_of)
);

-- Burger of the Week spotlight
CREATE TABLE IF NOT EXISTS burger_spotlight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  week_of DATE NOT NULL,
  restaurant_name TEXT NOT NULL,
  burger_name TEXT NOT NULL,
  price DECIMAL(6,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city_id, week_of)
);

-- Weekly market commentary
CREATE TABLE IF NOT EXISTS market_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of DATE NOT NULL UNIQUE,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  factors JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- Seed cities
INSERT INTO cities (name, state, slug) VALUES
  ('Boston', 'MA', 'boston-ma'),
  ('Seattle', 'WA', 'seattle-wa')
ON CONFLICT (slug) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE burger_spotlight ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Public read access for all display tables
CREATE POLICY "Public read cities" ON cities FOR SELECT USING (true);
CREATE POLICY "Public read snapshots" ON bpi_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read spotlights" ON burger_spotlight FOR SELECT USING (true);
CREATE POLICY "Public read reports" ON market_reports FOR SELECT USING (true);

-- Subscribers: public insert (for newsletter signup), no read
CREATE POLICY "Public insert subscribers" ON subscribers FOR INSERT WITH CHECK (true);

-- Service role (used by cron/API) can do everything via service key
-- Note: anon key respects RLS, service key bypasses it
