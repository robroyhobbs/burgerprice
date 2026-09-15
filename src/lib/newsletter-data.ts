import type { NewsletterContent, NewsletterEdition } from "./types";
import { resolveDataMode } from "./mode";

function dateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  return String(v ?? "");
}

function isoTimestamp(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return new Date().toISOString();
}

function parseSections(raw: unknown): NewsletterContent {
  let sections = raw;
  if (typeof sections === "string") {
    try {
      sections = JSON.parse(sections);
    } catch {
      sections = {} as NewsletterContent;
    }
  }
  return (sections ?? {}) as NewsletterContent;
}

function mapNewsletter(row: Record<string, unknown>): NewsletterEdition {
  return {
    id: String(row.id),
    week_of: dateStr(row.week_of),
    headline: String(row.headline ?? ""),
    sections: parseSections(row.sections),
    created_at: isoTimestamp(row.created_at),
  };
}

/**
 * Get the latest newsletter edition.
 * Prefers Postgres (DATABASE_URL), then Supabase, else null (seed has none).
 */
export async function getLatestNewsletter(): Promise<NewsletterEdition | null> {
  const mode = resolveDataMode();

  if (mode === "database") {
    try {
      const { query } = await import("./db");
      const res = await query<Record<string, unknown>>(
        `SELECT id::text AS id, week_of, headline, sections, created_at
         FROM newsletters
         ORDER BY week_of DESC
         LIMIT 1`,
      );
      if (!res.rows[0]) return null;
      return mapNewsletter(res.rows[0]);
    } catch (err) {
      console.error("Postgres getLatestNewsletter failed:", err);
      return null;
    }
  }

  if (mode === "supabase") {
    try {
      const { supabase } = await import("./supabase");
      const { data } = await supabase
        .from("newsletters")
        .select("*")
        .order("week_of", { ascending: false })
        .limit(1)
        .single();
      return (data as NewsletterEdition) ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Get all newsletter editions (for archive listing).
 */
export async function getAllNewsletters(): Promise<
  Pick<NewsletterEdition, "week_of" | "headline">[]
> {
  const mode = resolveDataMode();

  if (mode === "database") {
    try {
      const { query } = await import("./db");
      const res = await query<{ week_of: unknown; headline: string }>(
        `SELECT week_of, headline
         FROM newsletters
         ORDER BY week_of DESC`,
      );
      return res.rows.map((row) => ({
        week_of: dateStr(row.week_of),
        headline: String(row.headline ?? ""),
      }));
    } catch (err) {
      console.error("Postgres getAllNewsletters failed:", err);
      return [];
    }
  }

  if (mode === "supabase") {
    try {
      const { supabase } = await import("./supabase");
      const { data } = await supabase
        .from("newsletters")
        .select("week_of, headline")
        .order("week_of", { ascending: false });
      return (data as Pick<NewsletterEdition, "week_of" | "headline">[]) ?? [];
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Get a specific newsletter edition by week_of date string.
 */
export async function getNewsletterByWeek(
  weekOf: string,
): Promise<NewsletterEdition | null> {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) return null;

  const mode = resolveDataMode();

  if (mode === "database") {
    try {
      const { query } = await import("./db");
      const res = await query<Record<string, unknown>>(
        `SELECT id::text AS id, week_of, headline, sections, created_at
         FROM newsletters
         WHERE week_of = $1::date
         LIMIT 1`,
        [weekOf],
      );
      if (!res.rows[0]) return null;
      return mapNewsletter(res.rows[0]);
    } catch (err) {
      console.error("Postgres getNewsletterByWeek failed:", err);
      return null;
    }
  }

  if (mode === "supabase") {
    try {
      const { supabase } = await import("./supabase");
      const { data } = await supabase
        .from("newsletters")
        .select("*")
        .eq("week_of", weekOf)
        .single();
      return (data as NewsletterEdition) ?? null;
    } catch {
      return null;
    }
  }

  return null;
}
