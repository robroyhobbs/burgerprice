-- Industry news / stories related to burger prices
CREATE TABLE IF NOT EXISTS industry_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of DATE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'market',
  source TEXT,
  impact TEXT CHECK (impact IN ('bullish', 'bearish', 'neutral')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE industry_news ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read news" ON industry_news FOR SELECT USING (true);
