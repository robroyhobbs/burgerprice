export type DataMode = "database" | "supabase" | "seed";

/**
 * Resolve which data backend to use.
 * Prefer Cloud SQL (DATABASE_URL), then Supabase, else seed.
 */
export function resolveDataMode(): DataMode {
  if (process.env.DATABASE_URL) return "database";
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return "supabase";
  }
  return "seed";
}

export function isDatabaseRequired(): boolean {
  return process.env.REQUIRE_DATABASE === "true";
}
