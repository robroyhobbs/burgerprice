import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabase = Boolean(supabaseUrl && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let dbStatus = "disconnected";
  let citiesCount = 0;
  let snapshotsCount = 0;

  if (hasSupabase) {
    try {
      const { supabase } = await import("@/lib/supabase");

      const { count: cCount } = await supabase
        .from("cities")
        .select("*", { count: "exact", head: true });
      citiesCount = cCount ?? 0;

      const { count: sCount } = await supabase
        .from("bpi_snapshots")
        .select("*", { count: "exact", head: true });
      snapshotsCount = sCount ?? 0;

      dbStatus = "connected";
    } catch {
      dbStatus = "error";
    }
  }

  return NextResponse.json({
    status: "ok",
    app: "burger-price-index",
    database: dbStatus,
    cities: citiesCount,
    snapshots_count: snapshotsCount,
    timestamp: new Date().toISOString(),
  });
}
