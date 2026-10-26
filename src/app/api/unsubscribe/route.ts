import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

/**
 * POST /api/unsubscribe?token=...
 * Handles RFC 8058 one-click (body "List-Unsubscribe=One-Click") from mail clients
 * and the form on /unsubscribe. GET never unsubscribes (link scanners prefetch GETs);
 * it forwards to the confirmation page instead.
 */
export async function POST(req: NextRequest) {
  let token = req.nextUrl.searchParams.get("token") ?? "";
  const isForm = (req.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  if (!token && isForm) {
    const form = await req.formData().catch(() => null);
    token = String(form?.get("token") ?? "");
  }
  try {
    const email = await unsubscribeByToken(token);
    const fromBrowserForm = isForm && (req.headers.get("accept") ?? "").includes("text/html");
    if (fromBrowserForm) {
      // Relative Location: behind Cloud Run, req origin can be the internal host.
      return new NextResponse(null, {
        status: 303,
        headers: { Location: `/unsubscribe?done=${email ? "1" : "0"}` },
      });
    }
    return email
      ? NextResponse.json({ status: "ok" })
      : NextResponse.json({ error: "Unknown or expired link." }, { status: 404 });
  } catch (err) {
    console.error("unsubscribe failed:", err);
    return NextResponse.json({ error: "Please try again." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return new NextResponse(null, { status: 303, headers: { Location: `/unsubscribe${qs}` } });
}
