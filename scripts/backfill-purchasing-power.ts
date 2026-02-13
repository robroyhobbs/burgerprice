/**
 * One-time script to backfill purchasing power for all existing weeks.
 * Run from project root: npx tsx scripts/backfill-purchasing-power.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// City-level minimum wages (same as src/lib/wages.ts)
const WAGES: Record<string, { min_wage: number; source: string }> = {
  "new-york-ny": { min_wage: 17.0, source: "city" },
  "los-angeles-ca": { min_wage: 17.87, source: "city" },
  "chicago-il": { min_wage: 16.6, source: "city" },
  "san-francisco-ca": { min_wage: 16.99, source: "city" },
  "seattle-wa": { min_wage: 21.3, source: "city" },
  "boston-ma": { min_wage: 15.0, source: "state" },
  "austin-tx": { min_wage: 7.25, source: "federal" },
  "nashville-tn": { min_wage: 7.25, source: "federal" },
  "portland-or": { min_wage: 15.45, source: "city" },
  "new-orleans-la": { min_wage: 7.25, source: "federal" },
};

async function main() {
  // Get all cities
  const { data: cities } = await supabase.from("cities").select("id, slug");
  if (!cities) {
    console.log("No cities found");
    return;
  }

  // Get all unique weeks
  const { data: weeks } = await supabase
    .from("bpi_snapshots")
    .select("week_of")
    .order("week_of", { ascending: false });

  if (!weeks) {
    console.log("No snapshot data found");
    return;
  }

  const uniqueWeeks = [...new Set(weeks.map((w) => w.week_of))];
  console.log(`Found ${uniqueWeeks.length} weeks, ${cities.length} cities`);

  let inserted = 0;

  for (const weekOf of uniqueWeeks) {
    for (const city of cities) {
      const wage = WAGES[city.slug];
      if (!wage) continue;

      // Get avg BPI for this city/week
      const { data: snap } = await supabase
        .from("bpi_snapshots")
        .select("bpi_score")
        .eq("city_id", city.id)
        .eq("week_of", weekOf)
        .single();

      if (!snap || Number(snap.bpi_score) <= 0) continue;

      const avgBpi = Number(snap.bpi_score);
      const burgersPerHour = Math.round((wage.min_wage / avgBpi) * 100) / 100;

      const { error } = await supabase.from("purchasing_power").upsert(
        {
          city_id: city.id,
          week_of: weekOf,
          min_wage: wage.min_wage,
          avg_bpi: avgBpi,
          burgers_per_hour: burgersPerHour,
          wage_source: wage.source,
        },
        { onConflict: "city_id,week_of" },
      );

      if (!error) inserted++;
    }
    console.log(`  ${weekOf}: done`);
  }

  console.log(`Backfill complete. ${inserted} rows inserted/updated.`);
}

main().catch(console.error);
