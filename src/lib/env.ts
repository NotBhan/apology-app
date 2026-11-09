import { z } from "zod";

/**
 * Server configuration.
 *
 * There is deliberately **no fallback**. If `DATABASE_URL` is missing the data
 * layer throws when first used rather than quietly writing to disk — a
 * filesystem "fallback" in production is how data silently disappears.
 *
 * Validation is lazy (`getServerEnv()` at call time, not module load) so that
 * `next build` does not require production secrets, and so tests can construct
 * adapters directly without an environment.
 */

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (Neon pooled connection string).")
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a postgres:// connection string.",
    ),

  FILEBASE_ACCESS_KEY: z.string().min(1, "FILEBASE_ACCESS_KEY is required."),
  FILEBASE_SECRET_KEY: z.string().min(1, "FILEBASE_SECRET_KEY is required."),
  FILEBASE_BUCKET: z.string().min(1, "FILEBASE_BUCKET is required."),
  FILEBASE_ENDPOINT: z
    .string()
    .url("FILEBASE_ENDPOINT must be a URL.")
    .default("https://s3.filebase.io"),
  /**
   * Filebase recommends `auto`. A wrong region is the documented top cause of
   * `SignatureDoesNotMatch`, so this is explicit rather than inherited from
   * ambient AWS variables.
   */
  FILEBASE_REGION: z.string().min(1).default("auto"),

  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  /**
   * Only needed by the Neon cleanup function. The web app never uses it, so it
   * is optional here but mandatory in `neon.ts` for the function deployment.
   */
  CLEANUP_SECRET: z
    .string()
    .min(32, "CLEANUP_SECRET must be at least 32 characters.")
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export class ConfigurationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Missing or invalid configuration:\n- ${issues.join("\n- ")}`);
    this.name = "ConfigurationError";
    this.issues = issues;
  }
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new ConfigurationError(
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }

  cached = parsed.data;
  return cached;
}

/** Never throws: used by `/api/health` to report readiness without leaking values. */
export function configuredServices(): {
  database: boolean;
  storage: boolean;
  cleanupSecret: boolean;
} {
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const hasStorage = Boolean(
    process.env.FILEBASE_ACCESS_KEY &&
      process.env.FILEBASE_SECRET_KEY &&
      process.env.FILEBASE_BUCKET,
  );
  return {
    database: hasDatabase,
    storage: hasStorage,
    cleanupSecret: Boolean(process.env.CLEANUP_SECRET),
  };
}

export function resetServerEnvForTests() {
  cached = null;
}
