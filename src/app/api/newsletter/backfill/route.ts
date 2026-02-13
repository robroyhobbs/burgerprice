import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { generateNewsletter } from "@/lib/deepseek";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const weeks = Number(body.weeks) || 4;

    const { supabaseAdmin: supabase } = await import("@/lib/supabase-admin");

    // Get unique weeks with data, ordered most recent first
    const { data: snapWeeks } = await supabase
      .from("bpi_snapshots")
      .select("week_of")
      .order("week_of", { ascending: false });

    if (!snapWeeks) {
      return NextResponse.json({ error: "No data" }, { status: 500 });
    }

    const uniqueWeeks = [...new Set(snapWeeks.map((w) => w.week_of))].slice(
      0,
      weeks,
    );

    const results: Record<string, string> = {};

    for (const weekOf of uniqueWeeks) {
      // Skip existing
      const { data: existing } = await supabase
        .from("newsletters")
        .select("id")
        .eq("week_of", weekOf)
        .single();

      if (existing) {
        results[weekOf] = "exists";
        continue;
      }

      // Get snapshot data for this week
      const { data: snapshots } = await supabase
        .from("bpi_snapshots")
        .select("*, cities!inner(name, state)")
        .eq("week_of", weekOf);

      if (!snapshots || snapshots.length < 2) {
        results[weekOf] = "insufficient_data";
        continue;
      }

      const cities = snapshots.map((s: Record<string, unknown>) => {
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

      try {
        const newsletter = await generateNewsletter({ cities, weekOf });

        await supabase.from("newsletters").insert({
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

    return NextResponse.json({ status: "backfilled", results });
  } catch {
    return NextResponse.json(
      { error: "Backfill failed" },
      { status: 500 },
    );
  }
}
