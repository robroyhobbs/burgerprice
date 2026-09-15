import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { generateNewsletter } from "@/lib/deepseek";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { createCollectStore } from "@/lib/collect-store";
import { resolveDataMode } from "@/lib/mode";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type CityForNewsletter = {
  name: string;
  state: string;
  bpi: number;
  change: number | null;
  cheapest: { restaurant: string; price: number };
  mostExpensive: { restaurant: string; price: number };
};

function dateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  return String(v ?? "");
}

async function listRecentWeeks(weeks: number): Promise<string[]> {
  const mode = resolveDataMode();

  if (mode === "database") {
    const { query } = await import("@/lib/db");
    const res = await query<{ week_of: unknown }>(
      `SELECT DISTINCT week_of
       FROM bpi_snapshots
       ORDER BY week_of DESC
       LIMIT $1`,
      [weeks],
    );
    return res.rows.map((r) => dateStr(r.week_of));
  }

  if (mode === "supabase") {
    const { supabaseAdmin: supabase } = await import("@/lib/supabase-admin");
    const { data: snapWeeks } = await supabase
      .from("bpi_snapshots")
      .select("week_of")
      .order("week_of", { ascending: false });

    if (!snapWeeks) return [];
    return [...new Set(snapWeeks.map((w) => String(w.week_of)))].slice(
      0,
      weeks,
    );
  }

  return [];
}

async function getCitiesForWeek(weekOf: string): Promise<CityForNewsletter[]> {
  const mode = resolveDataMode();

  if (mode === "database") {
    const { query } = await import("@/lib/db");
    const res = await query<{
      bpi_score: string | number;
      change_pct: string | number | null;
      cheapest_restaurant: string;
      cheapest_price: string | number;
      most_expensive_restaurant: string;
      most_expensive_price: string | number;
      name: string;
      state: string;
    }>(
      `SELECT s.bpi_score,
              s.change_pct,
              s.cheapest_restaurant,
              s.cheapest_price,
              s.most_expensive_restaurant,
              s.most_expensive_price,
              c.name,
              c.state
       FROM bpi_snapshots s
       JOIN cities c ON c.id = s.city_id
       WHERE s.week_of = $1::date`,
      [weekOf],
    );

    return res.rows.map((s) => ({
      name: s.name,
      state: s.state,
      bpi: Number(s.bpi_score),
      change: s.change_pct !== null && s.change_pct !== undefined
        ? Number(s.change_pct)
        : null,
      cheapest: {
        restaurant: String(s.cheapest_restaurant),
        price: Number(s.cheapest_price),
      },
      mostExpensive: {
        restaurant: String(s.most_expensive_restaurant),
        price: Number(s.most_expensive_price),
      },
    }));
  }

  if (mode === "supabase") {
    const { supabaseAdmin: supabase } = await import("@/lib/supabase-admin");
    const { data: snapshots } = await supabase
      .from("bpi_snapshots")
      .select("*, cities!inner(name, state)")
      .eq("week_of", weekOf);

    if (!snapshots) return [];

    return snapshots.map((s: Record<string, unknown>) => {
      const city = s.cities as { name: string; state: string };
      return {
        name: city.name,
        state: city.state,
        bpi: Number(s.bpi_score),
        change: s.change_pct !== null ? Number(s.change_pct) : null,
        cheapest: {
          restaurant: String(s.cheapest_restaurant),
          price: Number(s.cheapest_price),
        },
        mostExpensive: {
          restaurant: String(s.most_expensive_restaurant),
          price: Number(s.most_expensive_price),
        },
      };
    });
  }

  return [];
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let weeks = 1;
    try {
      const body = await request.json();
      const n = Number(body?.weeks);
      if (Number.isFinite(n) && n > 0) weeks = Math.floor(n);
    } catch {
      // Empty / non-JSON body → default weeks = 1
    }

    const store = await createCollectStore();
    const uniqueWeeks = await listRecentWeeks(weeks);

    if (uniqueWeeks.length === 0) {
      return NextResponse.json({ error: "No data" }, { status: 500 });
    }

    const results: Record<string, string> = {};

    for (const weekOf of uniqueWeeks) {
      if (await store.hasNewsletter(weekOf)) {
        results[weekOf] = "exists";
        continue;
      }

      const cities = await getCitiesForWeek(weekOf);
      if (cities.length < 2) {
        results[weekOf] = "insufficient_data";
        continue;
      }

      try {
        const newsletter = await generateNewsletter({ cities, weekOf });

        await store.insertNewsletter({
          week_of: weekOf,
          headline: newsletter.headline,
          sections: newsletter,
        });

        results[weekOf] = "generated";
        await sleep(1000);
      } catch {
        results[weekOf] = "failed";
      }
    }

    revalidatePath("/newsletter");
    for (const weekOf of uniqueWeeks) {
      if (results[weekOf] === "generated") {
        revalidatePath(`/newsletter/${weekOf}`);
      }
    }

    return NextResponse.json({
      status: "backfilled",
      mode: store.mode,
      results,
    });
  } catch {
    return NextResponse.json(
      { error: "Backfill failed" },
      { status: 500 },
    );
  }
}
