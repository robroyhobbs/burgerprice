/**
 * Thin Resend client (REST, no SDK dependency).
 * https://resend.com/docs/api-reference/emails/send-email
 */
export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  /** Resend dedupes identical keys for 24h, a second guard against double sends. */
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
}

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

export function newsletterConfig() {
  return {
    enabled: process.env.NEWSLETTER_SEND_ENABLED === "true",
    apiKey: process.env.RESEND_API_KEY ?? "",
    from:
      process.env.NEWSLETTER_FROM ||
      "Burger Price Index <newsletter@burgerprice.com>",
    replyTo: process.env.NEWSLETTER_REPLY_TO || "",
    postalAddress: process.env.NEWSLETTER_POSTAL_ADDRESS || "",
    maxPerRun: Math.max(1, Number(process.env.NEWSLETTER_MAX_PER_RUN) || 90),
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://burgerprice.com",
  };
}

/** True only when the flag is on AND a key is configured. */
export function canSend(): boolean {
  const c = newsletterConfig();
  return c.enabled && Boolean(c.apiKey);
}

export async function sendEmail(msg: OutboundEmail): Promise<SendResult> {
  const c = newsletterConfig();
  if (!c.enabled) return { ok: false, error: "NEWSLETTER_SEND_ENABLED is off" };
  if (!c.apiKey) return { ok: false, error: "RESEND_API_KEY not set" };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${c.apiKey}`,
    "Content-Type": "application/json",
  };
  if (msg.idempotencyKey) headers["Idempotency-Key"] = msg.idempotencyKey.slice(0, 256);

  try {
    const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/emails`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: c.from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(c.replyTo ? { reply_to: c.replyTo } : {}),
        ...(msg.headers ? { headers: msg.headers } : {}),
        ...(msg.tags ? { tags: msg.tags } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: `resend ${res.status}: ${body.message ?? "error"}` };
    return { ok: true, id: body.id ?? null };
  } catch (err) {
    return { ok: false, error: `resend request failed: ${String(err)}` };
  }
}
