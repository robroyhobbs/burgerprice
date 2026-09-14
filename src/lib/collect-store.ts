import type { MarketFactor, RawPrice } from "./types";
import { resolveDataMode } from "./mode";

export type CityRow = {
  id: string;
  name: string;
  state: string;
  slug: string;
};

export type SnapshotInsert = {
  city_id: string;
  week_of: string;
  bpi_score: number;
  change_pct: number | null;
  cheapest_price: number;
  cheapest_restaurant: string;
  most_expensive_price: number;
  most_expensive_restaurant: string;
  avg_price: number;
  sample_size: number;
  raw_prices: RawPrice[];
};

export type SpotlightInsert = {
  city_id: string;
  week_of: string;
  restaurant_name: string;
  burger_name: string;
  price: number;
  description: string;
};

export type MarketReportInsert = {
  week_of: string;
  headline: string;
  summary: string;
  factors: MarketFactor[];
};

export type IndustryNewsInsert = {
  week_of: string;
  title: string;
  summary: string;
  category: string;
  source: string | null;
  impact: string;
};

export type PurchasingPowerInsert = {
  city_id: string;
  week_of: string;
  min_wage: number;
  avg_bpi: number;
  burgers_per_hour: number;
  wage_source: string;
};

export type NewsletterInsert = {
  week_of: string;
  headline: string;
  sections: unknown;
};

export interface CollectStore {
  mode: "database" | "supabase";
  listCities(): Promise<CityRow[]>;
  hasSnapshot(cityId: string, weekOf: string): Promise<boolean>;
  getPrevBpi(cityId: string, weekOf: string): Promise<number | null>;
  insertSnapshot(row: SnapshotInsert): Promise<void>;
  insertSpotlight(row: SpotlightInsert): Promise<void>;
  upsertMarketReport(row: MarketReportInsert): Promise<void>;
  insertIndustryNews(row: IndustryNewsInsert): Promise<void>;
  upsertPurchasingPower(row: PurchasingPowerInsert): Promise<void>;
  hasNewsletter(weekOf: string): Promise<boolean>;
  insertNewsletter(row: NewsletterInsert): Promise<void>;
}

export async function createCollectStore(): Promise<CollectStore> {
  const mode = resolveDataMode();
  if (mode === "database") {
    return createPostgresStore();
  }
  if (mode === "supabase") {
    return createSupabaseStore();
  }
  throw new Error(
    "Collect requires DATABASE_URL or Supabase admin credentials; seed mode is not writable",
  );
}

function createPostgresStore(): CollectStore {
  return {
    mode: "database",

    async listCities() {
      const { query } = await import("./db");
      const res = await query<{
        id: string;
        name: string;
        state: string;
        slug: string;
      }>(`SELECT id::text AS id, name, state, slug FROM cities ORDER BY name`);
      return res.rows;
    },

    async hasSnapshot(cityId, weekOf) {
      const { query } = await import("./db");
      const res = await query<{ id: string }>(
        `SELECT id::text AS id FROM bpi_snapshots
         WHERE city_id = $1::uuid AND week_of = $2::date
         LIMIT 1`,
        [cityId, weekOf],
      );
      return res.rows.length > 0;
    },

    async getPrevBpi(cityId, weekOf) {
      const { query } = await import("./db");
      const res = await query<{ bpi_score: string }>(
        `SELECT bpi_score::text AS bpi_score FROM bpi_snapshots
         WHERE city_id = $1::uuid AND week_of < $2::date
         ORDER BY week_of DESC
         LIMIT 1`,
        [cityId, weekOf],
      );
      if (!res.rows[0]) return null;
      return Number(res.rows[0].bpi_score);
    },

    async insertSnapshot(row) {
      const { query } = await import("./db");
      await query(
        `INSERT INTO bpi_snapshots (
           city_id, week_of, bpi_score, change_pct,
           cheapest_price, cheapest_restaurant,
           most_expensive_price, most_expensive_restaurant,
           avg_price, sample_size, raw_prices
         ) VALUES (
           $1::uuid, $2::date, $3, $4,
           $5, $6, $7, $8, $9, $10, $11::jsonb
         )
         ON CONFLICT (city_id, week_of) DO NOTHING`,
        [
          row.city_id,
          row.week_of,
          row.bpi_score,
          row.change_pct,
          row.cheapest_price,
          row.cheapest_restaurant,
          row.most_expensive_price,
          row.most_expensive_restaurant,
          row.avg_price,
          row.sample_size,
          JSON.stringify(row.raw_prices),
        ],
      );
    },

    async insertSpotlight(row) {
      const { query } = await import("./db");
      await query(
        `INSERT INTO burger_spotlight (
           city_id, week_of, restaurant_name, burger_name, price, description
         ) VALUES ($1::uuid, $2::date, $3, $4, $5, $6)
         ON CONFLICT (city_id, week_of) DO NOTHING`,
        [
          row.city_id,
          row.week_of,
          row.restaurant_name,
          row.burger_name,
          row.price,
          row.description,
        ],
      );
    },

    async upsertMarketReport(row) {
      const { query } = await import("./db");
      await query(
        `INSERT INTO market_reports (week_of, headline, summary, factors)
         VALUES ($1::date, $2, $3, $4::jsonb)
         ON CONFLICT (week_of) DO UPDATE SET
           headline = EXCLUDED.headline,
           summary = EXCLUDED.summary,
           factors = EXCLUDED.factors`,
        [
          row.week_of,
          row.headline,
          row.summary,
          JSON.stringify(row.factors),
        ],
      );
    },

    async insertIndustryNews(row) {
      const { query } = await import("./db");
      await query(
        `INSERT INTO industry_news (week_of, title, summary, category, source, impact)
         VALUES ($1::date, $2, $3, $4, $5, $6)`,
        [
          row.week_of,
          row.title,
          row.summary,
          row.category,
          row.source,
          row.impact,
        ],
      );
    },

    async upsertPurchasingPower(row) {
      const { query } = await import("./db");
      await query(
        `INSERT INTO purchasing_power (
           city_id, week_of, min_wage, avg_bpi, burgers_per_hour, wage_source
         ) VALUES ($1::uuid, $2::date, $3, $4, $5, $6)
         ON CONFLICT (city_id, week_of) DO UPDATE SET
           min_wage = EXCLUDED.min_wage,
           avg_bpi = EXCLUDED.avg_bpi,
           burgers_per_hour = EXCLUDED.burgers_per_hour,
           wage_source = EXCLUDED.wage_source`,
        [
          row.city_id,
          row.week_of,
          row.min_wage,
          row.avg_bpi,
          row.burgers_per_hour,
          row.wage_source,
        ],
      );
    },

    async hasNewsletter(weekOf) {
      const { query } = await import("./db");
      const res = await query<{ id: string }>(
        `SELECT id::text AS id FROM newsletters WHERE week_of = $1::date LIMIT 1`,
        [weekOf],
      );
      return res.rows.length > 0;
    },

    async insertNewsletter(row) {
      const { query } = await import("./db");
      await query(
        `INSERT INTO newsletters (week_of, headline, sections)
         VALUES ($1::date, $2, $3::jsonb)
         ON CONFLICT (week_of) DO NOTHING`,
        [row.week_of, row.headline, JSON.stringify(row.sections)],
      );
    },
  };
}

async function createSupabaseStore(): Promise<CollectStore> {
  // Dynamic import so missing Supabase env does not crash module load on Cloud SQL.
  const { supabaseAdmin } = await import("./supabase-admin");
  const supabase = supabaseAdmin;

  return {
    mode: "supabase",

    async listCities() {
      const { data, error } = await supabase.from("cities").select("*");
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: String(c.id),
        name: String(c.name),
        state: String(c.state),
        slug: String(c.slug),
      }));
    },

    async hasSnapshot(cityId, weekOf) {
      const { data } = await supabase
        .from("bpi_snapshots")
        .select("id")
        .eq("city_id", cityId)
        .eq("week_of", weekOf)
        .maybeSingle();
      return Boolean(data);
    },

    async getPrevBpi(cityId, weekOf) {
      const { data } = await supabase
        .from("bpi_snapshots")
        .select("bpi_score")
        .eq("city_id", cityId)
        .lt("week_of", weekOf)
        .order("week_of", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ? Number(data.bpi_score) : null;
    },

    async insertSnapshot(row) {
      const { error } = await supabase.from("bpi_snapshots").insert(row);
      if (error) throw error;
    },

    async insertSpotlight(row) {
      const { error } = await supabase.from("burger_spotlight").insert(row);
      if (error) throw error;
    },

    async upsertMarketReport(row) {
      const { error } = await supabase.from("market_reports").upsert(row, {
        onConflict: "week_of",
      });
      if (error) throw error;
    },

    async insertIndustryNews(row) {
      const { error } = await supabase.from("industry_news").insert(row);
      if (error) throw error;
    },

    async upsertPurchasingPower(row) {
      const { error } = await supabase.from("purchasing_power").upsert(row, {
        onConflict: "city_id,week_of",
      });
      if (error) throw error;
    },

    async hasNewsletter(weekOf) {
      const { data } = await supabase
        .from("newsletters")
        .select("id")
        .eq("week_of", weekOf)
        .maybeSingle();
      return Boolean(data);
    },

    async insertNewsletter(row) {
      const { error } = await supabase.from("newsletters").insert(row);
      if (error) throw error;
    },
  };
}
