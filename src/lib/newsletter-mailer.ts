import { getPool } from "./db";
import { getLatestNewsletter } from "./newsletter-data";
import { getAllCities } from "./data";
import { buildWeekSameStoreReads } from "./same-store";
import { canSend, newsletterConfig, sendEmail } from "./email/provider";
import { renderConfirmEmail, renderIssueEmail } from "./email/templates";
import {
  claimConfirmSend,
  claimIssueSend,
  countSubscribers,
  ensureNewsletterTables,
  isReservedTestAddress,
  listActiveUnsentForWeek,
  listPendingNeedingConfirm,
  recordIssueSend,
  releaseConfirmSend,
  type MailableSubscriber,
} from "./subscribers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Resend's default API rate limit is a few requests/second; stay well under it. */
const SEND_GAP_MS = 600;
const SEND_LOCK_KEY = 4_207_710; // pg advisory lock id for the weekly send
/** Don't mail an issue older than this (e.g. collect failed and the latest is last week's). */
const MAX_ISSUE_AGE_DAYS = 6;

export function unsubscribeUrl(token: string): string {
  return `${newsletterConfig().baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
}
export function oneClickUnsubscribeUrl(token: string): string {
  return `${newsletterConfig().baseUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}
export function confirmUrl(token: string): string {
  return `${newsletterConfig().baseUrl}/confirm?token=${encodeURIComponent(token)}`;
}

function listHeaders(sub: MailableSubscriber): Record<string, string> {
  // RFC 8058 one-click unsubscribe (required by Gmail/Yahoo bulk-sender rules).
  return {
    "List-Unsubscribe": `<${oneClickUnsubscribeUrl(sub.unsubscribe_token)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Send (or skip) the double opt-in email for one pending subscriber. */
export async function sendConfirmation(
  sub: MailableSubscriber,
): Promise<"sent" | "skipped" | "disabled" | "failed"> {
  if (!canSend()) return "disabled";
  if (!sub.confirm_token || isReservedTestAddress(sub.email)) return "skipped";
  if (!(await claimConfirmSend(sub.id))) return "skipped";
  const c = newsletterConfig();
  const email = renderConfirmEmail({
    confirmUrl: confirmUrl(sub.confirm_token),
    unsubscribeUrl: unsubscribeUrl(sub.unsubscribe_token),
    postalAddress: c.postalAddress,
  });
  const res = await sendEmail({
    to: sub.email,
    ...email,
    headers: listHeaders(sub),
    tags: [{ name: "kind", value: "confirm" }],
  });
  if (!res.ok) {
    console.error("newsletter confirm send failed:", res.error);
    await releaseConfirmSend(sub.id);
    return "failed";
  }
  return "sent";
}

/** Mail confirm links to pending signups that never got one (e.g. signed up while sending was off). */
export async function runConfirmBacklog(opts: { dryRun: boolean }) {
  const c = newsletterConfig();
  const pending = (await listPendingNeedingConfirm(c.maxPerRun)).filter(
    (s) => !isReservedTestAddress(s.email),
  );
  if (opts.dryRun || !canSend()) {
    return { job: "confirm", dry_run: true, enabled: canSend(), would_send: pending.length };
  }
  let sent = 0;
  let failed = 0;
  for (const sub of pending) {
    const r = await sendConfirmation(sub);
    if (r === "sent") sent++;
    if (r === "failed") failed++;
    await sleep(SEND_GAP_MS);
  }
  return { job: "confirm", dry_run: false, enabled: true, sent, failed };
}

function issueAgeDays(weekOf: string): number {
  const t = Date.parse(`${weekOf.slice(0, 10)}T00:00:00Z`);
  return (Date.now() - t) / 86_400_000;
}

/**
 * Send the latest issue to every active subscriber exactly once.
 * Idempotent: a (week, subscriber) row is claimed before sending, so re-runs only
 * pick up people not yet mailed (including anyone past the per-run cap).
 */
export async function runWeeklySend(opts: { dryRun: boolean }) {
  await ensureNewsletterTables();
  const c = newsletterConfig();
  const edition = await getLatestNewsletter();
  if (!edition) return { job: "issue", status: "no_issue" };
  const week = edition.week_of.slice(0, 10);
  const counts = await countSubscribers();
  const age = issueAgeDays(week);

  if (age > MAX_ISSUE_AGE_DAYS) {
    return { job: "issue", status: "stale_issue", week_of: week, age_days: Math.round(age) };
  }

  const queue = (await listActiveUnsentForWeek(week, c.maxPerRun)).filter(
    (s) => !isReservedTestAddress(s.email),
  );
  const base = { job: "issue", week_of: week, subscribers: counts };

  if (opts.dryRun || !canSend()) {
    return {
      ...base,
      status: "dry_run",
      enabled: c.enabled,
      has_api_key: Boolean(c.apiKey),
      would_send: queue.length,
    };
  }
  if (!c.postalAddress) {
    // CAN-SPAM: commercial email must carry a valid physical postal address.
    return { ...base, status: "blocked", reason: "NEWSLETTER_POSTAL_ADDRESS not set" };
  }

  // One sender at a time across instances.
  const client = await getPool().connect();
  try {
    const lock = await client.query<{ ok: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS ok",
      [SEND_LOCK_KEY],
    );
    if (!lock.rows[0]?.ok) return { ...base, status: "already_running" };

    let sameStore: ReturnType<typeof Object.fromEntries> | undefined;
    try {
      const cities = await getAllCities();
      sameStore = Object.fromEntries(buildWeekSameStoreReads(cities, week));
    } catch (err) {
      console.error("newsletter: same-store reads unavailable:", err);
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    for (const sub of queue) {
      if (!(await claimIssueSend(week, sub.id))) {
        skipped++;
        continue;
      }
      const email = renderIssueEmail({
        edition,
        baseUrl: c.baseUrl,
        unsubscribeUrl: unsubscribeUrl(sub.unsubscribe_token),
        postalAddress: c.postalAddress,
        sameStore,
      });
      const res = await sendEmail({
        to: sub.email,
        ...email,
        headers: listHeaders(sub),
        idempotencyKey: `bpi-issue-${week}-${sub.id}`,
        tags: [
          { name: "kind", value: "issue" },
          { name: "week", value: week },
        ],
      });
      await recordIssueSend(week, sub.id, res);
      if (res.ok) sent++;
      else {
        failed++;
        console.error(`newsletter send failed for subscriber ${sub.id}:`, res.error);
      }
      await sleep(SEND_GAP_MS);
    }
    const remaining = (await listActiveUnsentForWeek(week, 1_000_000)).filter(
      (s) => !isReservedTestAddress(s.email),
    ).length;
    return { ...base, status: "sent", sent, failed, skipped, remaining };
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [SEND_LOCK_KEY]).catch(() => {});
    client.release();
  }
}
