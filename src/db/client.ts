import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getServerEnv } from "../lib/env";
import * as schema from "./schema";

/**
 * Drizzle over Neon's HTTP driver.
 *
 * `neon-http` opens no connection pool and holds no session, which is the right
 * shape for Vercel's serverless functions. The trade-off is explicit: there are
 * **no interactive transactions**, so every mutation is either a single
 * statement or a `db.batch` — and no transaction ever spans an external call.
 *
 * This module deliberately avoids `server-only` so the same factory can be used
 * by the Neon cleanup function.
 */
export function createDb(connectionString: string) {
  return drizzle(neon(connectionString), { schema });
}

export type Database = ReturnType<typeof createDb>;

let instance: Database | null = null;

export function getDb(): Database {
  if (instance) return instance;
  const { DATABASE_URL } = getServerEnv();
  instance = createDb(DATABASE_URL);
  return instance;
}

export function resetDbForTests() {
  instance = null;
}

export { schema };
