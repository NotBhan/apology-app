/**
 * Mandatory isolation and target-identity verification for destructive and
 * infrastructure acceptance tests.
 *
 * Never falls back to `DATABASE_URL` or live `FILEBASE_BUCKET`.
 */

const TEST_DB_NAME_RE = /(^|[-_])(test|testing|ci|spec|sandbox|ephemeral)($|[-_])/i;
const PROD_DB_NAME_RE = /(^|[-_])(prod|production)($|[-_])/i;

export interface ParsedPostgresTarget {
  protocol: string;
  host: string;
  port: string;
  database: string;
}

export function parsePostgresTarget(rawUrl: string): ParsedPostgresTarget {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid Postgres test database URL.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("TEST_DATABASE_URL must use postgres:// or postgresql://.");
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) {
    throw new Error("TEST_DATABASE_URL must specify an explicit database name.");
  }

  return {
    protocol: parsed.protocol,
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || "5432",
    database,
  };
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

/**
 * Verifies that `testUrl` points to an explicitly isolated test database and
 * never shares host/port/database identity with `DATABASE_URL`.
 */
export function assertIsolatedTestDatabaseUrl(
  testUrl: string | undefined,
  prodUrl: string | undefined = process.env.DATABASE_URL,
): ParsedPostgresTarget {
  if (!testUrl || !testUrl.trim()) {
    throw new Error("TEST_DATABASE_URL is required for destructive integration tests.");
  }

  const target = parsePostgresTarget(testUrl.trim());

  if (prodUrl && prodUrl.trim()) {
    let prodTarget: ParsedPostgresTarget | null = null;
    try {
      prodTarget = parsePostgresTarget(prodUrl.trim());
    } catch {
      prodTarget = null;
    }

    if (
      prodTarget &&
      prodTarget.host === target.host &&
      prodTarget.port === target.port &&
      prodTarget.database === target.database
    ) {
      throw new Error(
        "Refusing destructive test run: TEST_DATABASE_URL resolves to the same target as DATABASE_URL.",
      );
    }
  }

  if (PROD_DB_NAME_RE.test(target.database)) {
    throw new Error(
      `Refusing destructive test run against database "${target.database}" with a production name.`,
    );
  }

  if (!isLoopbackHost(target.host) && !TEST_DB_NAME_RE.test(target.database)) {
    throw new Error(
      `Refusing destructive test run against non-local database "${target.database}". Rename it to include a test marker (e.g. *_test).`,
    );
  }

  return target;
}

/**
 * Verifies live `current_database()` identity immediately after connecting and
 * prior to running any destructive setup (`DELETE` / `TRUNCATE` / seeding).
 */
export async function verifyConnectedTestDatabaseIdentity(
  query: (sqlText: string) => Promise<ReadonlyArray<{ db_name?: string | null }>>,
  testUrl: string,
  prodUrl: string | undefined = process.env.DATABASE_URL,
): Promise<string> {
  const expected = assertIsolatedTestDatabaseUrl(testUrl, prodUrl);
  const rows = await query("SELECT current_database() AS db_name");
  const actualDb = rows[0]?.db_name?.trim();

  if (!actualDb) {
    throw new Error("Could not verify connected test database name via current_database().");
  }
  if (actualDb !== expected.database) {
    throw new Error(
      `Connected database "${actualDb}" does not match TEST_DATABASE_URL target "${expected.database}".`,
    );
  }
  if (PROD_DB_NAME_RE.test(actualDb)) {
    throw new Error(`Refusing destructive setup on production-named database "${actualDb}".`);
  }

  return actualDb;
}

export interface IsolatedAcceptanceEnv {
  testDatabaseUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region: string;
}

/**
 * Resolves acceptance infrastructure settings strictly from opt-in and
 * isolated variables (`ACCEPTANCE=1`, `TEST_DATABASE_URL`, `FILEBASE_TEST_BUCKET`).
 */
export function resolveIsolatedAcceptanceEnv(
  env: Record<string, string | undefined> = process.env,
): { requested: boolean; ready: boolean; config: IsolatedAcceptanceEnv | null; reason?: string } {
  const requested = env.ACCEPTANCE === "1";
  if (!requested) {
    return { requested: false, ready: false, config: null };
  }

  const testDatabaseUrl = env.TEST_DATABASE_URL?.trim();
  const bucket = env.FILEBASE_TEST_BUCKET?.trim();
  const liveBucket = env.FILEBASE_BUCKET?.trim();
  const accessKeyId = (env.FILEBASE_TEST_ACCESS_KEY ?? env.FILEBASE_ACCESS_KEY)?.trim();
  const secretAccessKey = (env.FILEBASE_TEST_SECRET_KEY ?? env.FILEBASE_SECRET_KEY)?.trim();

  if (!testDatabaseUrl || !bucket || !accessKeyId || !secretAccessKey) {
    return {
      requested: true,
      ready: false,
      config: null,
      reason:
        "ACCEPTANCE=1 requires TEST_DATABASE_URL, FILEBASE_TEST_BUCKET, FILEBASE_TEST_ACCESS_KEY (or FILEBASE_ACCESS_KEY), and FILEBASE_TEST_SECRET_KEY (or FILEBASE_SECRET_KEY).",
    };
  }

  if (liveBucket && bucket === liveBucket) {
    return {
      requested: true,
      ready: false,
      config: null,
      reason: "FILEBASE_TEST_BUCKET must be distinct from FILEBASE_BUCKET.",
    };
  }

  try {
    assertIsolatedTestDatabaseUrl(testDatabaseUrl, env.DATABASE_URL);
  } catch (err) {
    return {
      requested: true,
      ready: false,
      config: null,
      reason: err instanceof Error ? err.message : "Invalid TEST_DATABASE_URL.",
    };
  }

  return {
    requested: true,
    ready: true,
    config: {
      testDatabaseUrl,
      accessKeyId,
      secretAccessKey,
      bucket,
      endpoint: env.FILEBASE_TEST_ENDPOINT?.trim() || env.FILEBASE_ENDPOINT?.trim() || "https://s3.filebase.io",
      region: env.FILEBASE_TEST_REGION?.trim() || env.FILEBASE_REGION?.trim() || "auto",
    },
  };
}
