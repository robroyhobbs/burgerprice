CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of date UNIQUE NOT NULL,
  headline text NOT NULL,
  sections jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON newsletters FOR SELECT USING (true);
