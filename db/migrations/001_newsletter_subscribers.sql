-- Newsletter subscribers + per-issue send log (Cloud SQL / Postgres).
-- The app also runs these statements idempotently at runtime
-- (src/lib/subscribers.ts → ensureNewsletterTables), so applying this by hand
-- is optional. Keep the two in sync.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                BIGSERIAL PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'unsubscribed')),
  source            TEXT,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  confirm_token     TEXT UNIQUE,
  confirm_sent_at   TIMESTAMPTZ,
  confirmed_at      TIMESTAMPTZ,
  unsubscribed_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx
  ON newsletter_subscribers (status);
