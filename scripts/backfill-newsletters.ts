/**
 * One-time script to backfill newsletter editions for the last 4 weeks.
 * Run from project root: npx tsx scripts/backfill-newsletters.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Dynamically import the generate function (needs the project's tsconfig paths)
async function main() {
  // Get last 4 weeks that have BPI data
  const { data: weeks } = await supabase
    .from("bpi_snapshots")
    .select("week_of")
    .order("week_of", { ascending: false });

  if (!weeks) {
    console.log("No snapshot data found");
    return;
  }

  const uniqueWeeks = [...new Set(weeks.map((w) => w.week_of))].slice(0, 4);
  console.log(`Found ${uniqueWeeks.length} weeks to backfill:`, uniqueWeeks);

  for (const weekOf of uniqueWeeks) {
    // Skip if newsletter already exists
    const { data: existing } = await supabase
      .from("newsletters")
      .select("id")
      .eq("week_of", weekOf)
      .single();

    if (existing) {
      console.log(`  ${weekOf}: already exists, skipping`);
      continue;
    }

    // Get all city data for this week
    const { data: snapshots } = await supabase
      .from("bpi_snapshots")
      .select("*, cities!inner(name, state)")
      .eq("week_of", weekOf);

    if (!snapshots || snapshots.length < 2) {
      console.log(`  ${weekOf}: insufficient data (${snapshots?.length ?? 0} cities), skipping`);
      continue;
    }

    // Build city data for the newsletter generator
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

    console.log(`  ${weekOf}: generating newsletter for ${cities.length} cities...`);

    try {
      // Call DeepSeek to generate the newsletter
      const { generateNewsletter } = await import("../src/lib/deepseek");
      const newsletter = await generateNewsletter({ cities, weekOf });

      await supabase.from("newsletters").insert({
        week_of: weekOf,
        headline: newsletter.headline,
        sections: newsletter,
      });

      console.log(`  ${weekOf}: ✓ "${newsletter.headline}"`);

      // Brief delay between API calls
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.log(`  ${weekOf}: ✗ failed — ${err}`);
    }
  }

  console.log("Backfill complete.");
}

main().catch(console.error);
