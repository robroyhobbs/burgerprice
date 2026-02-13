-- City Expansion: Add lat/lng to cities, create city_requests table, seed 8 new cities

-- Add lat/lng columns to cities
ALTER TABLE cities ADD COLUMN IF NOT EXISTS lat DECIMAL(9,6);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS lng DECIMAL(9,6);

-- Update existing cities with coordinates
UPDATE cities SET lat = 42.3601, lng = -71.0589 WHERE slug = 'boston-ma';
UPDATE cities SET lat = 47.6062, lng = -122.3321 WHERE slug = 'seattle-wa';

-- Seed 8 new food cities
INSERT INTO cities (name, state, slug, lat, lng) VALUES
  ('New York', 'NY', 'new-york-ny', 40.7128, -74.0060),
  ('Los Angeles', 'CA', 'los-angeles-ca', 34.0522, -118.2437),
  ('Chicago', 'IL', 'chicago-il', 41.8781, -87.6298),
  ('Nashville', 'TN', 'nashville-tn', 36.1627, -86.7816),
  ('Austin', 'TX', 'austin-tx', 30.2672, -97.7431),
  ('New Orleans', 'LA', 'new-orleans-la', 29.9511, -90.0715),
  ('Portland', 'OR', 'portland-or', 45.5152, -122.6784),
  ('San Francisco', 'CA', 'san-francisco-ca', 37.7749, -122.4194)
ON CONFLICT (slug) DO NOTHING;

-- City requests table
CREATE TABLE IF NOT EXISTS city_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  request_count INT DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city, state)
);

-- Enable RLS on city_requests
ALTER TABLE city_requests ENABLE ROW LEVEL SECURITY;

-- Anon can read city requests (to show request count)
CREATE POLICY "Public read city_requests" ON city_requests FOR SELECT USING (true);

-- Anon can insert city requests (to submit a request)
CREATE POLICY "Public insert city_requests" ON city_requests FOR INSERT WITH CHECK (true);
