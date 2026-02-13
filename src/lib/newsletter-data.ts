import type { NewsletterEdition } from "./types";

/**
 * Get the latest newsletter edition.
 */
export async function getLatestNewsletter(): Promise<NewsletterEdition | null> {
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!hasSupabase) return null;

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

/**
 * Get all newsletter editions (for archive listing).
 */
export async function getAllNewsletters(): Promise<
  Pick<NewsletterEdition, "week_of" | "headline">[]
> {
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!hasSupabase) return [];

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

/**
 * Get a specific newsletter edition by week_of date string.
 */
export async function getNewsletterByWeek(
  weekOf: string,
): Promise<NewsletterEdition | null> {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) return null;

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!hasSupabase) return null;

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
