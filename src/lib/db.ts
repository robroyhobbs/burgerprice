import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;

const POOL_DEFAULTS: Pick<
  PoolConfig,
  "keepAlive" | "max" | "connectionTimeoutMillis" | "allowExitOnIdle"
> = {
  keepAlive: true,
  max: 5,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
};

/**
 * Build a pg Pool config from DATABASE_URL.
 * Supports Cloud SQL Unix socket URLs like:
 *   postgres://user:pass@/dbname?host=/cloudsql/project:region:instance
 *
 * Prefer connectionString when there is no socket host param (avoids
 * mishandling special characters in passwords). When a socket host is
 * present, parse user/password/database carefully without relying solely
 * on `new URL()` for the password segment.
 */
export function buildPoolConfig(databaseUrl: string): PoolConfig {
  const hostMatch = databaseUrl.match(/[?&]host=([^&]*)/);
  const socketHost = hostMatch ? decodeURIComponent(hostMatch[1]) : null;

  if (socketHost && (socketHost.startsWith("/cloudsql/") || socketHost.startsWith("/"))) {
    // postgres[ql]://user:password@/database?...
    // Capture password until the '@/' that precedes the db name so encoded
    // or unusual password characters are less likely to break parsing.
    const credMatch = databaseUrl.match(
      /^postgres(?:ql)?:\/\/([^:/?#]+):([^@]*)@\/([^?]*)/i,
    );

    if (credMatch) {
      return {
        user: decodeURIComponent(credMatch[1]),
        password: decodeURIComponent(credMatch[2]),
        database: decodeURIComponent(credMatch[3]),
        host: socketHost,
        ...POOL_DEFAULTS,
      };
    }

    // Fallback for atypical URL shapes
    const url = new URL(databaseUrl);
    return {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
      host: socketHost,
      ...POOL_DEFAULTS,
    };
  }

  return {
    connectionString: databaseUrl,
    ...POOL_DEFAULTS,
  };
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
