import { defineConfig } from "drizzle-kit";

/**
 * `generate` never connects; it only diffs `schema.ts` against the snapshot in
 * `./drizzle`. The placeholder keeps `generate` runnable in CI without secrets.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://placeholder@localhost:5432/placeholder",
  },
});
