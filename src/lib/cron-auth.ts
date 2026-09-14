import { timingSafeEqual } from "crypto";

function secretsEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Authorize cron/backfill callers via CRON_SECRET.
 * Accepts either `Authorization: Bearer ${CRON_SECRET}` or `X-Cron-Secret: ${CRON_SECRET}`
 * (Cloud Scheduler often sends the latter and may put OIDC on Authorization).
 */
export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader && secretsEqual(authHeader, `Bearer ${secret}`)) {
    return true;
  }

  const xCronSecret = req.headers.get("x-cron-secret");
  if (xCronSecret && secretsEqual(xCronSecret, secret)) {
    return true;
  }

  return false;
}
