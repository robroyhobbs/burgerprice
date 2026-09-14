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
import { createCollectStore } from "@/lib/collect-store";
import { resolveLlmProvider } from "@/lib/llm";

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

  let aiProvider: string;
  try {
    aiProvider = resolveLlmProvider();
  } catch (err) {
    return NextResponse.json(
      {
        error: "LLM not configured",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }

  try {
    const store = await createCollectStore();
    const cities = await store.listCities();
    if (!cities || cities.length === 0) {
      return NextResponse.json(
        { error: "No cities configured" },
        { status: 500 },
      );
    }

    const weekOf = getMonday(new Date()).toISOString().split("T")[0];
    const results: Record<string, number> = {};
    const collectedCities: Array<{
      id: string;
      slug: string;
      name: string;
      state: string;
      bpi: number;
      change: number | null;
      cheapest: { restaurant: string; price: number };
      mostExpensive: { restaurant: string; price: number };
    }> = [];

    for (const city of cities) {
      try {
        if (await store.hasSnapshot(city.id, weekOf)) {
          results[city.slug] = -1; // Already exists
          continue;
        }

        const prices = await researchBurgerPrices(city.name, city.state);
        if (prices.length === 0) {
          results[city.slug] = 0; // No prices returned
          continue;
        }

        const bpiScore = calculateBpi(prices);
        const extremes = findExtremes(prices);
        const prevBpi = await store.getPrevBpi(city.id, weekOf);
        const changePct = calculateChange(bpiScore, prevBpi);

        await store.insertSnapshot({
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

        const spotlight = await generateSpotlight(
          city.name,
          city.state,
          prices,
        );
        await store.insertSpotlight({
          city_id: city.id,
          week_of: weekOf,
          restaurant_name: spotlight.restaurantName,
          burger_name: spotlight.burgerName,
          price: spotlight.price,
          description: spotlight.description,
        });

        results[city.slug] = bpiScore;
        collectedCities.push({
          id: city.id,
          slug: city.slug,
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

        revalidatePath(`/cities/${city.slug}`);
        await sleep(500);
      } catch {
        results[city.slug] = -2; // Error
      }
    }

    if (collectedCities.length >= 2) {
      try {
        const report = await generateMarketReport({
          cities: collectedCities,
        });

        await store.upsertMarketReport({
          week_of: weekOf,
          headline: report.headline,
          summary: report.summary,
          factors: report.factors,
        });

        const newsItems = await generateIndustryNews({
          cities: collectedCities.map((c) => ({
            name: c.name,
            state: c.state,
            bpi: c.bpi,
          })),
          weekOf,
        });

        for (const item of newsItems) {
          await store.insertIndustryNews(item);
        }
      } catch {
        // Report/news generation failure is non-fatal
      }
    }

    let ppStatus = "skipped";
    if (collectedCities.length >= 1) {
      try {
        const { getAllWages } = await import("@/lib/wages");
        const wages = getAllWages();

        for (const cityData of collectedCities) {
          const wage = wages[cityData.slug];
          if (!wage || cityData.bpi <= 0) continue;

          const burgersPerHour =
            Math.round((wage.min_wage / cityData.bpi) * 100) / 100;

          await store.upsertPurchasingPower({
            city_id: cityData.id,
            week_of: weekOf,
            min_wage: wage.min_wage,
            avg_bpi: cityData.bpi,
            burgers_per_hour: burgersPerHour,
            wage_source: wage.source,
          });
        }
        ppStatus = "computed";
      } catch {
        ppStatus = "failed";
      }
    }

    let newsletterStatus = "skipped";
    if (collectedCities.length >= 2) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (await store.hasNewsletter(weekOf)) {
            newsletterStatus = "exists";
            break;
          }

          const newsletter = await generateNewsletter({
            cities: collectedCities,
            weekOf,
          });

          await store.insertNewsletter({
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

    revalidatePath("/");
    revalidatePath("/cities");

    return NextResponse.json({
      status: "collected",
      week_of: weekOf,
      data_mode: store.mode,
      ai_provider: aiProvider,
      cities_collected: collectedCities.length,
      cities_total: cities.length,
      newsletter_status: newsletterStatus,
      purchasing_power_status: ppStatus,
      results,
    });
  } catch (err) {
    console.error("Collection failed:", err);
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
