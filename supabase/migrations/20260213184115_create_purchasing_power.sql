CREATE TABLE IF NOT EXISTS purchasing_power (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text NOT NULL,
  week_of date NOT NULL,
  min_wage numeric NOT NULL,
  avg_bpi numeric NOT NULL,
  burgers_per_hour numeric NOT NULL,
  wage_source text NOT NULL DEFAULT 'static',
  created_at timestamptz DEFAULT now(),
  UNIQUE(city_id, week_of)
);

ALTER TABLE purchasing_power ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON purchasing_power
  FOR SELECT USING (true);
