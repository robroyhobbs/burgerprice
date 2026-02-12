import { createClient } from "@supabase/supabase-js";
import { calculateBpi, calculateChange, findExtremes } from "../lib/bpi.js";
import {
  WEEKS, BOSTON_PRICES, SEATTLE_PRICES,
  BOSTON_SPOTLIGHTS, SEATTLE_SPOTLIGHTS, MARKET_REPORTS,
} from "../lib/seed-data.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log("Seeding Burger Price Index database...\n");

  // Get city IDs
  const { data: cities, error: citiesError } = await supabase
    .from("cities")
    .select("*");

  if (citiesError || !cities) {
    console.error("Failed to fetch cities:", citiesError);
    process.exit(1);
  }

  const boston = cities.find((c) => c.slug === "boston-ma");
  const seattle = cities.find((c) => c.slug === "seattle-wa");

  if (!boston || !seattle) {
    console.error("Cities not found. Did the migration run?");
    process.exit(1);
  }

  console.log(`Found cities: ${boston.name} (${boston.id}), ${seattle.name} (${seattle.id})\n`);

  // Seed BPI snapshots
  const cityConfigs = [
    { city: boston, prices: BOSTON_PRICES, spotlights: BOSTON_SPOTLIGHTS },
    { city: seattle, prices: SEATTLE_PRICES, spotlights: SEATTLE_SPOTLIGHTS },
  ];

  for (const config of cityConfigs) {
    let prevBpi: number | null = null;

    for (const week of WEEKS) {
      const prices = config.prices[week];
      if (!prices) continue;

      const bpiScore = calculateBpi(prices);
      const changePct = calculateChange(bpiScore, prevBpi);
      const extremes = findExtremes(prices);

      const { error: snapError } = await supabase.from("bpi_snapshots").upsert({
        city_id: config.city.id,
        week_of: week,
        bpi_score: bpiScore,
        change_pct: changePct,
        cheapest_price: extremes.cheapest.price,
        cheapest_restaurant: extremes.cheapest.restaurant,
        most_expensive_price: extremes.mostExpensive.price,
        most_expensive_restaurant: extremes.mostExpensive.restaurant,
        avg_price: Math.round((prices.reduce((s, p) => s + p.price, 0) / prices.length) * 100) / 100,
        sample_size: prices.length,
        raw_prices: prices,
      }, { onConflict: "city_id,week_of" });

      if (snapError) {
        console.error(`  Snapshot error for ${config.city.name} ${week}:`, snapError.message);
      } else {
        console.log(`  ${config.city.name} ${week}: BPI $${bpiScore.toFixed(2)} (${changePct !== null ? (changePct > 0 ? "+" : "") + changePct.toFixed(1) + "%" : "NEW"})`);
      }

      prevBpi = bpiScore;

      // Seed spotlight
      const spotlight = config.spotlights[week];
      if (spotlight) {
        const { error: spotError } = await supabase.from("burger_spotlight").upsert({
          city_id: config.city.id,
          week_of: week,
          restaurant_name: spotlight.restaurant_name,
          burger_name: spotlight.burger_name,
          price: spotlight.price,
          description: spotlight.description,
        }, { onConflict: "city_id,week_of" });

        if (spotError) {
          console.error(`  Spotlight error:`, spotError.message);
        }
      }
    }

    console.log();
  }

  // Seed market reports
  console.log("Seeding market reports...");
  for (const week of WEEKS) {
    const report = MARKET_REPORTS[week];
    if (!report) continue;

    const { error: reportError } = await supabase.from("market_reports").upsert({
      week_of: week,
      headline: report.headline,
      summary: report.summary,
      factors: report.factors,
    }, { onConflict: "week_of" });

    if (reportError) {
      console.error(`  Report error for ${week}:`, reportError.message);
    } else {
      console.log(`  ${week}: "${report.headline}"`);
    }
  }

  console.log("\nSeed complete!");
}

seed().catch(console.error);
