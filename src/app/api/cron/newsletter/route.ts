import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runConfirmBacklog, runWeeklySend } from "@/lib/newsletter-mailer";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

/**
 * POST /api/cron/newsletter?job=issue|confirm|all[&dry_run=1]
 * CRON_SECRET auth. Nothing is mailed unless NEWSLETTER_SEND_ENABLED=true and
 * RESEND_API_KEY is set; otherwise every job reports what it *would* send.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = req.nextUrl.searchParams.get("job") ?? "all";
  const dryRun = ["1", "true"].includes(req.nextUrl.searchParams.get("dry_run") ?? "");
  if (!["issue", "confirm", "all"].includes(job)) {
    return NextResponse.json({ error: "job must be issue, confirm, or all" }, { status: 400 });
  }
  try {
    const results = [];
    if (job === "confirm" || job === "all") results.push(await runConfirmBacklog({ dryRun }));
    if (job === "issue" || job === "all") results.push(await runWeeklySend({ dryRun }));
    return NextResponse.json({ status: "ok", results });
  } catch (err) {
    console.error("cron/newsletter failed:", err);
    return NextResponse.json({ error: "newsletter job failed" }, { status: 500 });
  }
}
