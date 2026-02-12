import { createClient } from "@supabase/supabase-js";
import { INDUSTRY_NEWS } from "../lib/seed-data.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedNews() {
  const items = INDUSTRY_NEWS["2026-02-10"] || [];
  console.log(`Seeding ${items.length} news items...`);
  for (const item of items) {
    const { error } = await supabase.from("industry_news").insert(item);
    if (error) {
      console.error("Error:", error.message);
    } else {
      console.log(`  ${item.title.substring(0, 65)}...`);
    }
  }
  console.log("Done!");
}

seedNews();
