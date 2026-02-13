import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { calculateBpi, calculateChange, findExtremes } from "@/lib/bpi";
import {
  researchBurgerPrices,
  generateMarketReport,
  generateSpotlight,
  generateIndustryNews,
  generateNewsletter,
} from "@/lib/deepseek";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { supabaseAdmin: supabase } = await import("@/lib/supabase-admin");

    // Get cities
    const { data: cities } = await supabase.from("cities").select("*");
    if (!cities || cities.length === 0) {
      return NextResponse.json(
        { error: "No cities configured" },
        { status: 500 },
      );
    }

    const weekOf = getMonday(new Date()).toISOString().split("T")[0];
    const results: Record<string, number> = {};
    const collectedCities: Array<{
      name: string;
      state: string;
      bpi: number;
      change: number | null;
      cheapest: { restaurant: string; price: number };
      mostExpensive: { restaurant: string; price: number };
    }> = [];

    for (const city of cities) {
      try {
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
        if (prices.length === 0) {
          results[city.slug] = 0; // No prices returned
          continue;
        }

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

        // Generate spotlight
        const spotlight = await generateSpotlight(
          city.name,
          city.state,
          prices,
        );
        await supabase.from("burger_spotlight").insert({
          city_id: city.id,
          week_of: weekOf,
          restaurant_name: spotlight.restaurantName,
          burger_name: spotlight.burgerName,
          price: spotlight.price,
          description: spotlight.description,
        });

        results[city.slug] = bpiScore;
        collectedCities.push({
          name: city.name,
          state: city.state,
          bpi: bpiScore,
          change: changePct,
          cheapest: {
            restaurant: extremes.cheapest.restaurant,
            price: extremes.cheapest.price,
          },
          mostExpensive: {
            restaurant: extremes.mostExpensive.restaurant,
            price: extremes.mostExpensive.price,
          },
        });

        // Revalidate city page
        revalidatePath(`/cities/${city.slug}`);

        // Brief delay between cities to avoid DeepSeek rate limits
        await sleep(500);
      } catch {
        // One city failing doesn't stop the rest
        results[city.slug] = -2; // Error
      }
    }

    // Generate market report if we collected at least 2 cities
    if (collectedCities.length >= 2) {
      try {
        const report = await generateMarketReport({
          cities: collectedCities,
        });

        await supabase.from("market_reports").upsert(
          {
            week_of: weekOf,
            headline: report.headline,
            summary: report.summary,
            factors: report.factors,
          },
          { onConflict: "week_of" },
        );

        // Generate industry news
        const newsItems = await generateIndustryNews({
          cities: collectedCities.map((c) => ({
            name: c.name,
            state: c.state,
            bpi: c.bpi,
          })),
          weekOf,
        });

        for (const item of newsItems) {
          await supabase.from("industry_news").insert(item);
        }
      } catch {
        // Report/news generation failure is non-fatal
      }
    }

    // Generate newsletter if we have enough data
    let newsletterStatus = "skipped";
    if (collectedCities.length >= 2) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Check if newsletter already exists for this week
          const { data: existingNl } = await supabase
            .from("newsletters")
            .select("id")
            .eq("week_of", weekOf)
            .single();

          if (existingNl) {
            newsletterStatus = "exists";
            break;
          }

          const newsletter = await generateNewsletter({
            cities: collectedCities,
            weekOf,
          });

          await supabase.from("newsletters").insert({
            week_of: weekOf,
            headline: newsletter.headline,
            sections: newsletter,
          });

          newsletterStatus = "generated";
          revalidatePath("/newsletter");
          break;
        } catch {
          if (attempt === 0) {
            newsletterStatus = "retrying";
            await sleep(1000);
          } else {
            newsletterStatus = "failed";
          }
        }
      }
    }

    // Revalidate homepage and cities index
    revalidatePath("/");
    revalidatePath("/cities");

    return NextResponse.json({
      status: "collected",
      week_of: weekOf,
      cities_collected: collectedCities.length,
      cities_total: cities.length,
      newsletter_status: newsletterStatus,
      results,
    });
  } catch {
    return NextResponse.json({ error: "Collection failed" }, { status: 500 });
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
