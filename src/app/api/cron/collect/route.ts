import { NextRequest, NextResponse } from "next/server";
import { calculateBpi, calculateChange, findExtremes } from "@/lib/bpi";
import { researchBurgerPrices, generateMarketReport, generateSpotlight } from "@/lib/deepseek";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { supabase } = await import("@/lib/supabase");

    // Get cities
    const { data: cities } = await supabase.from("cities").select("*");
    if (!cities || cities.length === 0) {
      return NextResponse.json({ error: "No cities configured" }, { status: 500 });
    }

    const weekOf = getMonday(new Date()).toISOString().split("T")[0];
    const results: Record<string, number> = {};

    for (const city of cities) {
      // Check if already collected this week
      const { data: existing } = await supabase
        .from("bpi_snapshots")
        .select("id")
        .eq("city_id", city.id)
        .eq("week_of", weekOf)
        .single();

      if (existing) {
        results[city.slug] = -1; // Already exists
        continue;
      }

      // Research prices
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
        prevSnapshot ? Number(prevSnapshot.bpi_score) : null
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
        avg_price: Math.round((prices.reduce((s, p) => s + p.price, 0) / prices.length) * 100) / 100,
        sample_size: prices.length,
        raw_prices: prices,
      });

      // Generate spotlight
      const spotlight = await generateSpotlight(city.name, city.state, prices);
      await supabase.from("burger_spotlight").insert({
        city_id: city.id,
        week_of: weekOf,
        ...spotlight,
        restaurant_name: spotlight.restaurantName,
        burger_name: spotlight.burgerName,
      });

      results[city.slug] = bpiScore;
    }

    // Generate market report
    const bostonBpi = results["boston-ma"] ?? 0;
    const seattleBpi = results["seattle-wa"] ?? 0;

    if (bostonBpi > 0 && seattleBpi > 0) {
      const report = await generateMarketReport({
        bostonBpi,
        bostonChange: null, // Could calculate from previous
        seattleBpi,
        seattleChange: null,
      });

      await supabase.from("market_reports").upsert({
        week_of: weekOf,
        headline: report.headline,
        summary: report.summary,
        factors: report.factors,
      }, { onConflict: "week_of" });
    }

    return NextResponse.json({
      status: "collected",
      week_of: weekOf,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Collection failed" },
      { status: 500 }
    );
  }
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
