import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertIsolatedTestDatabaseUrl,
  resolveIsolatedAcceptanceEnv,
  verifyConnectedTestDatabaseIdentity,
} from "./db-safety";

/**
 * Regression guard for the incident where running tests deleted production rows
 * or connected to production Filebase/Neon via `DATABASE_URL` or `FILEBASE_BUCKET`.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function testFilesThatDeleteRows(): { path: string; source: string }[] {
  return walk(SRC)
    .filter((path) => /\.test\.(ts|tsx)$/.test(path))
    .map((path) => ({ path, source: readFileSync(path, "utf8") }))
    .filter((file) => file.path !== __filename && !file.path.endsWith("db-safety.ts"))
    .filter((file) => /DELETE\s+FROM/i.test(file.source));
}

function testFilesThatUseRealFilebase(): { path: string; source: string }[] {
  return walk(SRC)
    .filter((path) => /\.test\.(ts|tsx)$/.test(path))
    .map((path) => ({ path, source: readFileSync(path, "utf8") }))
    .filter((file) => file.path !== __filename)
    .filter((file) => /FilebaseObjectStore\.fromEnv|FILEBASE_BUCKET/.test(file.source));
}

describe("destructive test suites and isolation guard", () => {
  it("never lets a test suite with DELETE FROM connect using DATABASE_URL", () => {
    const offenders = testFilesThatDeleteRows()
      .filter((file) => /createDb\(\s*process\.env\.DATABASE_URL|Pool\(\{\s*connectionString:\s*process\.env\.DATABASE_URL/i.test(file.source))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it("requires every destructive test suite to verify connected test database identity", () => {
    const missingGuard = testFilesThatDeleteRows()
      .filter((file) => !/verifyConnectedTestDatabaseIdentity/.test(file.source))
      .map((file) => file.path);

    expect(missingGuard).toEqual([]);
  });

  it("never loads production FILEBASE_BUCKET inside acceptance/test files", () => {
    const offenders = testFilesThatUseRealFilebase()
      .filter((file) => /FilebaseObjectStore\.fromEnv\s*\(/.test(file.source))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it("still detects destructive suites so this guard is not vacuous", () => {
    expect(testFilesThatDeleteRows().length).toBeGreaterThanOrEqual(3);
  });

  it("rejects missing, production-matching, or unisolated TEST_DATABASE_URL targets", () => {
    expect(() => assertIsolatedTestDatabaseUrl(undefined)).toThrow(/TEST_DATABASE_URL is required/);
    expect(() =>
      assertIsolatedTestDatabaseUrl(
        "postgres://user:pass@ep-123.us-east-2.aws.neon.tech/neondb",
        "postgres://user:pass@ep-123.us-east-2.aws.neon.tech/neondb",
      ),
    ).toThrow(/same target as DATABASE_URL/);
    expect(() =>
      assertIsolatedTestDatabaseUrl("postgres://user:pass@ep-123.us-east-2.aws.neon.tech/neondb"),
    ).toThrow(/non-local database/);
    expect(() =>
      assertIsolatedTestDatabaseUrl("postgres://user:pass@localhost:5432/koi_production"),
    ).toThrow(/production name/);

    expect(
      assertIsolatedTestDatabaseUrl(
        "postgres://user:pass@ep-test.aws.neon.tech/neondb_test",
        "postgres://user:pass@ep-prod.aws.neon.tech/neondb",
      ).database,
    ).toBe("neondb_test");
  });

  it("verifies connected current_database() identity before allowing destructive setup", async () => {
    await expect(
      verifyConnectedTestDatabaseIdentity(
        async () => [{ db_name: "neondb" }],
        "postgres://user:pass@localhost:5432/koi_test",
      ),
    ).rejects.toThrow(/does not match TEST_DATABASE_URL target/);

    await expect(
      verifyConnectedTestDatabaseIdentity(
        async () => [{ db_name: "koi_test" }],
        "postgres://user:pass@localhost:5432/koi_test",
        "postgres://user:pass@ep-prod.aws.neon.tech/neondb",
      ),
    ).resolves.toBe("koi_test");
  });

  it("skips acceptance env cleanly unless ACCEPTANCE=1 and rejects shared live bucket", () => {
    expect(
      resolveIsolatedAcceptanceEnv({
        DATABASE_URL: "postgres://user:pass@ep-prod.aws.neon.tech/neondb",
        FILEBASE_BUCKET: "prod-bucket",
        FILEBASE_ACCESS_KEY: "k",
        FILEBASE_SECRET_KEY: "s",
      }),
    ).toEqual({ requested: false, ready: false, config: null });

    expect(
      resolveIsolatedAcceptanceEnv({
        ACCEPTANCE: "1",
        TEST_DATABASE_URL: "postgres://localhost:5432/koi_test",
        FILEBASE_BUCKET: "prod-bucket",
        FILEBASE_TEST_BUCKET: "prod-bucket",
        FILEBASE_ACCESS_KEY: "k",
        FILEBASE_SECRET_KEY: "s",
      }).ready,
    ).toBe(false);
  });
});
