import { NextResponse } from "next/server";
import { resolveDataMode, isDatabaseRequired } from "@/lib/mode";

export async function GET() {
  const mode = resolveDataMode();
  const databaseRequired = isDatabaseRequired();

  let dbStatus: "connected" | "disconnected" | "error" = "disconnected";
  let citiesCount = 0;
  let snapshotsCount = 0;
  let effectiveMode = mode;

  if (mode === "database") {
    try {
      const { query } = await import("@/lib/db");
      const [citiesRes, snapshotsRes] = await Promise.all([
        query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM cities`),
        query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM bpi_snapshots`,
        ),
      ]);
      citiesCount = Number(citiesRes.rows[0]?.count ?? 0);
      snapshotsCount = Number(snapshotsRes.rows[0]?.count ?? 0);
      dbStatus = "connected";
      effectiveMode = "database";
    } catch (err) {
      console.error("Health check Postgres error:", err);
      dbStatus = "error";
      // Keep mode=database so smoke checks can detect a broken DB path
      effectiveMode = "database";
    }
  } else if (mode === "supabase") {
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
    mode: effectiveMode,
    database_required: databaseRequired,
    cities: citiesCount,
    snapshots_count: snapshotsCount,
    timestamp: new Date().toISOString(),
  });
}
