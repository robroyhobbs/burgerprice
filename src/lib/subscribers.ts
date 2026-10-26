import { randomBytes } from "crypto";
import { query } from "./db";

export type SubscriberStatus = "pending" | "active" | "unsubscribed";

export interface Subscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  source: string | null;
  unsubscribe_token: string;
  confirm_token: string | null;
  confirm_sent_at: Date | null;
  created_at: Date;
}

// Keep in sync with db/migrations/*.sql
const DDL = [
  `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
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
  )`,
  `CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx
    ON newsletter_subscribers (status)`,
];

let ensured: Promise<void> | null = null;

/** Create subscriber tables if missing. Memoized per instance; retried on failure. */
export function ensureNewsletterTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      for (const stmt of DDL) await query(stmt);
    })().catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Normalize + validate an email. Returns null when invalid.
 * Deliberately conservative: one @, a dotted domain, no spaces/quotes/brackets.
 */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  const at = email.lastIndexOf("@");
  if (at < 1 || at !== email.indexOf("@")) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64) return null;
  if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return null;
  if (local.startsWith(".") || local.endsWith(".") || local.includes(".."))
    return null;
  if (
    !/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
      domain,
    )
  )
    return null;
  return email;
}

/** RFC 2606 / 6761 reserved domains: stored (for testing) but never mailed. */
export function isReservedTestAddress(email: string): boolean {
  const domain = email.slice(email.indexOf("@") + 1);
  return (
    /(^|\.)example\.(com|net|org)$/.test(domain) ||
    /\.(test|example|invalid|localhost)$/.test(domain)
  );
}

export type SubscribeOutcome =
  | { kind: "created"; subscriber: Subscriber }
  | { kind: "resubscribed"; subscriber: Subscriber }
  | { kind: "already_pending"; subscriber: Subscriber }
  | { kind: "already_active"; subscriber: Subscriber };

function mapRow(row: Record<string, unknown>): Subscriber {
  return {
    id: String(row.id),
    email: String(row.email),
    status: row.status as SubscriberStatus,
    source: (row.source as string | null) ?? null,
    unsubscribe_token: String(row.unsubscribe_token),
    confirm_token: (row.confirm_token as string | null) ?? null,
    confirm_sent_at: (row.confirm_sent_at as Date | null) ?? null,
    created_at: row.created_at as Date,
  };
}

const COLS = `id::text AS id, email, status, source, unsubscribe_token,
  confirm_token, confirm_sent_at, created_at`;

/**
 * Insert or revive a subscriber. New and previously-unsubscribed addresses
 * land in `pending` until they confirm (double opt-in). Throws on DB errors —
 * callers must surface a failure, never a fake success.
 */
export async function upsertSubscriber(
  email: string,
  source: string | null,
): Promise<SubscribeOutcome> {
  await ensureNewsletterTables();

  const inserted = await query<Record<string, unknown>>(
    `INSERT INTO newsletter_subscribers (email, source, unsubscribe_token, confirm_token)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING ${COLS}`,
    [email, source, newToken(), newToken()],
  );
  if (inserted.rows[0]) {
    return { kind: "created", subscriber: mapRow(inserted.rows[0]) };
  }

  const revived = await query<Record<string, unknown>>(
    `UPDATE newsletter_subscribers
       SET status = 'pending', confirm_token = $2, confirm_sent_at = NULL,
           unsubscribed_at = NULL, source = COALESCE($3, source), updated_at = now()
     WHERE email = $1 AND status = 'unsubscribed'
     RETURNING ${COLS}`,
    [email, newToken(), source],
  );
  if (revived.rows[0]) {
    return { kind: "resubscribed", subscriber: mapRow(revived.rows[0]) };
  }

  const existing = await query<Record<string, unknown>>(
    `SELECT ${COLS} FROM newsletter_subscribers WHERE email = $1`,
    [email],
  );
  const row = existing.rows[0];
  if (!row) throw new Error("subscriber upsert race: row vanished");
  const subscriber = mapRow(row);
  return subscriber.status === "active"
    ? { kind: "already_active", subscriber }
    : { kind: "already_pending", subscriber };
}

/** Mark a subscriber unsubscribed by token. Returns the email, or null if no match. */
export async function unsubscribeByToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  await ensureNewsletterTables();
  const res = await query<{ email: string }>(
    `UPDATE newsletter_subscribers
       SET status = 'unsubscribed',
           unsubscribed_at = COALESCE(unsubscribed_at, now()),
           updated_at = now()
     WHERE unsubscribe_token = $1
     RETURNING email`,
    [token],
  );
  return res.rows[0]?.email ?? null;
}

/** Confirm a pending subscriber by token. Returns the email, or null if no match. */
export async function confirmByToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  await ensureNewsletterTables();
  const res = await query<{ email: string }>(
    `UPDATE newsletter_subscribers
       SET status = 'active', confirmed_at = COALESCE(confirmed_at, now()),
           updated_at = now()
     WHERE confirm_token = $1 AND status IN ('pending', 'active')
     RETURNING email`,
    [token],
  );
  return res.rows[0]?.email ?? null;
}
