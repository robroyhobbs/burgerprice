import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail, upsertSubscriber } from "@/lib/subscribers";
import { canSend } from "@/lib/email/provider";
import { sendConfirmation } from "@/lib/newsletter-mailer";

export const dynamic = "force-dynamic";

// Simple in-memory rate limit (per-instance, resets on deploy)
const rateLimitMap = new Map<string, number>();

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || "unknown";
}

function cleanSource(raw: unknown): string {
  if (typeof raw !== "string") return "web";
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9:_/-]/g, "").slice(0, 64);
  return s || "web";
}

export async function POST(request: NextRequest) {
  // Rate limiting: one attempt per IP every 20 seconds
  const ip = clientIp(request);
  const now = Date.now();
  const lastAttempt = rateLimitMap.get(ip) ?? 0;
  if (now - lastAttempt < 20_000) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }
  rateLimitMap.set(ip, now);
  if (rateLimitMap.size > 10_000) rateLimitMap.clear();

  let body: { email?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    // Never pretend: without storage there is no subscription.
    console.error("subscribe: DATABASE_URL not set; refusing signup");
    return NextResponse.json(
      { error: "Signups are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  try {
    const outcome = await upsertSubscriber(email, cleanSource(body.source));
    if (outcome.kind === "already_active") {
      return NextResponse.json({
        status: "ok",
        result: "already_subscribed",
        message: "You're already on the list. See you Monday.",
      });
    }
    // Double opt-in: mail the confirm link when sending is live. Failure here must not
    // lose the signup; the row is stored and the cron confirm backlog retries.
    if (canSend()) {
      try {
        await sendConfirmation(outcome.subscriber);
      } catch (err) {
        console.error("subscribe: confirm email failed:", err);
      }
    }
    return NextResponse.json({
      status: "ok",
      result: outcome.kind === "already_pending" ? "already_pending" : "pending",
      message:
        "You're on the list. Watch your inbox for a quick confirm link before the first Monday print.",
    });
  } catch (err) {
    console.error("subscribe: storage failed:", err);
    return NextResponse.json(
      { error: "We couldn't save your signup. Please try again." },
      { status: 500 },
    );
  }
}
