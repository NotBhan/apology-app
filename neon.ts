import { defineConfig } from "@neon/config/v1";

/**
 * Neon Functions configuration.
 *
 * `cleanup` runs on the branch next to Postgres, on a `schedule` trigger. That
 * trigger is the only thing that deletes expired apologies and their Filebase
 * objects — the Next.js app has no cron route, no timer and no worker.
 *
 * Secrets are read from `process.env` when `neon deploy` evaluates this file;
 * `--env .env.production` loads them. Only variables declared here are
 * deployed. `DATABASE_URL` is injected by Neon and must not be declared.
 */
export default defineConfig({
  functions: {
    cleanup: {
      name: "Delete expired apologies",
      source: "./neon/functions/cleanup.ts",
      env: {
        // Required secrets. Deliberately NOT coerced with `?? ""`: passing an
        // empty string uploads it and deletes the live key on redeploy. A
        // missing value must make defineConfig throw instead.
        FILEBASE_ACCESS_KEY: process.env.FILEBASE_ACCESS_KEY!,
        FILEBASE_SECRET_KEY: process.env.FILEBASE_SECRET_KEY!,
        FILEBASE_BUCKET: process.env.FILEBASE_BUCKET!,
        FILEBASE_ENDPOINT: process.env.FILEBASE_ENDPOINT ?? "https://s3.filebase.io",
        FILEBASE_REGION: process.env.FILEBASE_REGION ?? "auto",
        // Operator-only path. Trigger deliveries do not use it.
        CLEANUP_SECRET: process.env.CLEANUP_SECRET!,
      },
    },
  },
  triggers: {
    "hourly-cleanup": {
      type: "schedule",
      function: "cleanup",
      cron: "17 * * * *",
    },
  },
});
