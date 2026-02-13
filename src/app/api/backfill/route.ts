import { NextRequest, NextResponse } from "next/server";
import { calculateBpi, calculateChange, findExtremes } from "@/lib/bpi";
import { researchBurgerPrices } from "@/lib/deepseek";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const cityId = typeof body.cityId === "string" ? body.cityId.trim() : "";
    const weeks = Number(body.weeks) || 0;

    if (!cityId) {
      return NextResponse.json(
        { error: "cityId is required" },
        { status: 400 },
      );
    }

    if (weeks < 1 || weeks > 12) {
      return NextResponse.json(
        { error: "weeks must be between 1 and 12" },
        { status: 400 },
      );
    }

    const { supabaseAdmin: supabase } = await import("@/lib/supabase-admin");

    // Validate city exists
    const { data: city } = await supabase
      .from("cities")
      .select("*")
      .eq("id", cityId)
      .single();

    if (!city) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    // Generate week dates going backwards from current week
    const now = new Date();
    const currentMonday = getMonday(now);
    const weekDates: string[] = [];

    for (let i = weeks; i >= 1; i--) {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() - i * 7);
      weekDates.push(d.toISOString().split("T")[0]);
    }

    let weeksCreated = 0;

    for (const weekOf of weekDates) {
      try {
        // Skip if snapshot already exists for this week
        const { data: existing } = await supabase
          .from("bpi_snapshots")
          .select("id")
          .eq("city_id", city.id)
          .eq("week_of", weekOf)
          .single();

        if (existing) continue;

        // Research prices via DeepSeek
        const prices = await researchBurgerPrices(city.name, city.state);
        if (prices.length === 0) continue;

        // Calculate BPI
        const bpiScore = calculateBpi(prices);
        const extremes = findExtremes(prices);

        // Get previous week's BPI for change calculation
        const { data: prevSnapshot } = await supabase
          .from("bpi_snapshots")
          .select("bpi_score")
          .eq("city_id", city.id)
          .lt("week_of", weekOf)
          .order("week_of", { ascending: false })
          .limit(1)
          .single();

        const changePct = calculateChange(
          bpiScore,
          prevSnapshot ? Number(prevSnapshot.bpi_score) : null,
        );

        // Insert snapshot
        await supabase.from("bpi_snapshots").insert({
          city_id: city.id,
          week_of: weekOf,
          bpi_score: bpiScore,
          change_pct: changePct,
          cheapest_price: extremes.cheapest.price,
          cheapest_restaurant: extremes.cheapest.restaurant,
          most_expensive_price: extremes.mostExpensive.price,
          most_expensive_restaurant: extremes.mostExpensive.restaurant,
          avg_price:
            Math.round(
              (prices.reduce((s, p) => s + p.price, 0) / prices.length) * 100,
            ) / 100,
          sample_size: prices.length,
          raw_prices: prices,
        });

        weeksCreated++;

        // Delay between DeepSeek calls
        await sleep(500);
      } catch {
        // One week failing doesn't stop the rest
      }
    }

    return NextResponse.json({
      status: "backfilled",
      city: city.name,
      weeks_requested: weeks,
      weeks_created: weeksCreated,
      weeks_skipped: weeks - weeksCreated,
    });
  } catch {
    return NextResponse.json(
      { error: "Backfill failed" },
      { status: 500 },
    );
  }
}
