import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;

/**
 * Build a pg Pool config from DATABASE_URL.
 * Supports Cloud SQL Unix socket URLs like:
 *   postgres://user:pass@/dbname?host=/cloudsql/project:region:instance
 */
export function buildPoolConfig(databaseUrl: string): PoolConfig {
  const url = new URL(databaseUrl);
  const socketHost = url.searchParams.get("host");

  if (socketHost && (socketHost.startsWith("/cloudsql/") || socketHost.startsWith("/"))) {
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    return {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      host: socketHost,
    };
  }

  return { connectionString: databaseUrl };
}

export function getPool(): Pool {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  pool = new Pool(buildPoolConfig(databaseUrl));
  pool.on("error", (err) => {
    console.error("Unexpected Postgres pool error:", err);
  });
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/** Reset the lazy pool (tests / hot reload). */
export async function closePool(): Promise<void> {
  if (!pool) return;
  const p = pool;
  pool = null;
  await p.end();
}
