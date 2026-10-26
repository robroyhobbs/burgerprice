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
  `CREATE TABLE IF NOT EXISTS newsletter_sends (
    id                  BIGSERIAL PRIMARY KEY,
    week_of             DATE NOT NULL,
    subscriber_id       BIGINT NOT NULL REFERENCES newsletter_subscribers (id) ON DELETE CASCADE,
    status              TEXT NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
    provider_message_id TEXT,
    error               TEXT,
    attempts            INT NOT NULL DEFAULT 1,
    attempted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at             TIMESTAMPTZ,
    UNIQUE (week_of, subscriber_id)
  )`,
  // Smoke-test rows from deploy verification (bpi-test+...@example.com) are never real people.
  `DELETE FROM newsletter_subscribers
    WHERE email LIKE 'bpi-test+%@example.com'`,
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

export interface MailableSubscriber {
  id: string;
  email: string;
  unsubscribe_token: string;
  confirm_token: string | null;
}

/** Pending subscribers who have never been sent a confirm email. */
export async function listPendingNeedingConfirm(
  limit: number,
): Promise<MailableSubscriber[]> {
  await ensureNewsletterTables();
  const res = await query<MailableSubscriber>(
    `SELECT id::text AS id, email, unsubscribe_token, confirm_token
       FROM newsletter_subscribers
      WHERE status = 'pending' AND confirm_sent_at IS NULL AND confirm_token IS NOT NULL
      ORDER BY created_at
      LIMIT $1`,
    [limit],
  );
  return res.rows;
}

/**
 * Atomically claim the right to send a confirm email (at most one per hour per address).
 * Returns false if another request already sent one recently.
 */
export async function claimConfirmSend(subscriberId: string): Promise<boolean> {
  const res = await query(
    `UPDATE newsletter_subscribers
        SET confirm_sent_at = now(), updated_at = now()
      WHERE id = $1::bigint AND status = 'pending'
        AND (confirm_sent_at IS NULL OR confirm_sent_at < now() - interval '1 hour')`,
    [subscriberId],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function releaseConfirmSend(subscriberId: string): Promise<void> {
  await query(
    `UPDATE newsletter_subscribers SET confirm_sent_at = NULL WHERE id = $1::bigint`,
    [subscriberId],
  );
}

/** Active subscribers with no send row (or a failed one) for this issue week. */
export async function listActiveUnsentForWeek(
  weekOf: string,
  limit: number,
): Promise<MailableSubscriber[]> {
  await ensureNewsletterTables();
  const res = await query<MailableSubscriber>(
    `SELECT s.id::text AS id, s.email, s.unsubscribe_token, s.confirm_token
       FROM newsletter_subscribers s
       LEFT JOIN newsletter_sends n
         ON n.subscriber_id = s.id AND n.week_of = $1::date
      WHERE s.status = 'active' AND (n.id IS NULL OR n.status = 'failed')
      ORDER BY s.id
      LIMIT $2`,
    [weekOf, limit],
  );
  return res.rows;
}

export async function countSubscribers(): Promise<Record<SubscriberStatus, number>> {
  await ensureNewsletterTables();
  const res = await query<{ status: SubscriberStatus; n: string }>(
    `SELECT status, count(*)::text AS n FROM newsletter_subscribers GROUP BY status`,
  );
  const out: Record<SubscriberStatus, number> = { pending: 0, active: 0, unsubscribed: 0 };
  for (const r of res.rows) out[r.status] = Number(r.n);
  return out;
}

/**
 * Claim one (week, subscriber) send. Returns true only for the caller that should send.
 * A row stuck in 'sending' (crash mid-send) is never retried automatically: better a
 * missed email than a double one.
 */
export async function claimIssueSend(weekOf: string, subscriberId: string): Promise<boolean> {
  const res = await query(
    `INSERT INTO newsletter_sends (week_of, subscriber_id, status)
     VALUES ($1::date, $2::bigint, 'sending')
     ON CONFLICT (week_of, subscriber_id) DO UPDATE
       SET status = 'sending', attempts = newsletter_sends.attempts + 1,
           attempted_at = now(), error = NULL
       WHERE newsletter_sends.status = 'failed' AND newsletter_sends.attempts < 3
     RETURNING id`,
    [weekOf, subscriberId],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function recordIssueSend(
  weekOf: string,
  subscriberId: string,
  result: { ok: true; id: string | null } | { ok: false; error: string },
): Promise<void> {
  if (result.ok) {
    await query(
      `UPDATE newsletter_sends SET status = 'sent', sent_at = now(), provider_message_id = $3
        WHERE week_of = $1::date AND subscriber_id = $2::bigint`,
      [weekOf, subscriberId, result.id],
    );
  } else {
    await query(
      `UPDATE newsletter_sends SET status = 'failed', error = left($3, 500)
        WHERE week_of = $1::date AND subscriber_id = $2::bigint`,
      [weekOf, subscriberId, result.error],
    );
  }
}
