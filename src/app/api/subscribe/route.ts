import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limit (per-instance, resets on deploy)
const rateLimitMap = new Map<string, number>();

export async function POST(request: NextRequest) {
  // Rate limiting: 3 attempts per IP per minute
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const now = Date.now();
  const lastAttempt = rateLimitMap.get(ip) ?? 0;

  if (now - lastAttempt < 20_000) {
    // 20 seconds between attempts
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }
  rateLimitMap.set(ip, now);

  // Parse body
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { email } = body;

  // Validate email
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  // Check if Supabase is configured
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (!hasSupabase) {
    // In dev without Supabase, just acknowledge
    return NextResponse.json({
      status: "ok",
      message: "Subscribed! (dev mode - no database)",
    });
  }

  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin");

    const { error } = await supabaseAdmin
      .from("subscribers")
      .insert({ email: trimmed });

    if (error) {
      // Unique constraint violation = already subscribed
      if (error.code === "23505") {
        return NextResponse.json({
          status: "ok",
          message: "You're already subscribed!",
        });
      }
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "ok",
      message: "Subscribed! Watch for the weekly BPI report.",
    });
  } catch {
    return NextResponse.json(
      { error: "Service temporarily unavailable." },
      { status: 500 },
    );
  }
}
