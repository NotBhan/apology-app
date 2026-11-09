import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb, type Database } from "@/db/client";
import { rateLimits } from "@/db/schema";

/**
 * Durable fixed-window rate limiting.
 *
 * The previous limiter was an in-memory map, which is per-instance and
 * therefore close to useless on serverless. This one is a single upsert per
 * request and is shared by every instance.
 */

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  hit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

export class PostgresRateLimiter implements RateLimiter {
  private readonly db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  async hit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const now = new Date();
    const resetAt = new Date(now.getTime() + rule.windowSeconds * 1000);

    // One statement: reset an elapsed window, otherwise increment. Returns the
    // post-write count so the decision and the counter cannot disagree.
    const result = await this.db.execute(sql`
      insert into ${rateLimits} (key, count, reset_at)
      values (${key}, 1, ${resetAt.toISOString()})
      on conflict (key) do update
        set count = case
              when ${rateLimits}.reset_at <= ${now.toISOString()} then 1
              else ${rateLimits}.count + 1
            end,
            reset_at = case
              when ${rateLimits}.reset_at <= ${now.toISOString()} then ${resetAt.toISOString()}
              else ${rateLimits}.reset_at
            end
      returning count, reset_at
    `);

    const rows = Array.isArray(result)
      ? (result as Record<string, unknown>[])
      : ((result as { rows?: Record<string, unknown>[] }).rows ?? []);
    const row = rows[0] ?? {};
    const count = Number(row.count ?? 1);
    const resetsAt = row.reset_at ? new Date(row.reset_at as string) : resetAt;

    return {
      allowed: count <= rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil((resetsAt.getTime() - now.getTime()) / 1000)),
    };
  }
}

let limiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!limiter) limiter = new PostgresRateLimiter();
  return limiter;
}

export function resetRateLimiterForTests() {
  limiter = null;
}

/** Stable, non-reversible bucket id; the raw address is never stored. */
export function rateLimitKey(scope: string, clientIp: string): string {
  return `${scope}:${createHash("sha256").update(clientIp, "utf8").digest("base64url")}`;
}

export function clientIpFromHeaders(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export const RATE_LIMITS = {
  createDraft: { limit: 10, windowSeconds: 3600 },
  upload: { limit: 30, windowSeconds: 3600 },
  serveUpload: { limit: 600, windowSeconds: 600 },
  readLetter: { limit: 120, windowSeconds: 600 },
  publish: { limit: 30, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export async function enforceRateLimit(
  request: Request,
  scope: keyof typeof RATE_LIMITS,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[scope];
  return getRateLimiter().hit(rateLimitKey(scope, clientIpFrom(request)), rule);
}

export function clientIpFrom(request: Request): string {
  return clientIpFromHeaders(request.headers);
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (!result.allowed) headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}
