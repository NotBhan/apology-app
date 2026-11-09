import "server-only";
import { createHash } from "node:crypto";
import { firestoreAvailable } from "@/lib/storage/firebase-admin";

/**
 * Fixed-window rate limiting for the endpoints that cost money or can be
 * scripted: draft creation, uploads, publishing and token lookups.
 *
 * Two backends behind one interface:
 * - `firestore`: durable counters shared by every serverless instance.
 *   Used whenever Firebase is configured (i.e. in production).
 * - `memory`: a per-process map. Correct for a single long-lived Node host and
 *   for tests; on a serverless platform it only rate-limits per instance, which
 *   is why it is not the production path.
 */

export interface RateLimitRule {
  /** Requests permitted per window, per key. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  readonly backend: "memory" | "firestore";
  hit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

/* -------------------------------------------------------------------------- */
/* Memory                                                                     */
/* -------------------------------------------------------------------------- */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 10_000;

export class MemoryRateLimiter implements RateLimiter {
  readonly backend = "memory" as const;
  private windows = new Map<string, WindowEntry>();

  async hit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = rule.windowSeconds * 1000;

    if (this.windows.size > MAX_TRACKED_KEYS) this.prune(now);

    const entry = this.windows.get(key);
    if (!entry || entry.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - 1),
        retryAfterSeconds: rule.windowSeconds,
      };
    }

    entry.count += 1;
    const allowed = entry.count <= rule.limit;
    return {
      allowed,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - entry.count),
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  private prune(now: number) {
    for (const [key, entry] of this.windows) {
      if (entry.resetAt <= now) this.windows.delete(key);
    }
    // Still full: drop the oldest windows rather than grow without bound.
    if (this.windows.size > MAX_TRACKED_KEYS) {
      const excess = this.windows.size - MAX_TRACKED_KEYS;
      let removed = 0;
      for (const key of this.windows.keys()) {
        this.windows.delete(key);
        if (++removed >= excess) break;
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Firestore                                                                  */
/* -------------------------------------------------------------------------- */

const COLLECTION = "rateLimits";

/** base64url keys contain no , so they are already valid document ids. */
function docId(key: string): string {
  return key.slice(0, 120);
}

export class FirestoreRateLimiter implements RateLimiter {
  readonly backend = "firestore" as const;

  async hit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const { getDb } = await import("@/lib/storage/firebase-admin");
    const db = await getDb();
    const ref = db.collection(COLLECTION).doc(docId(key));
    const windowMs = rule.windowSeconds * 1000;

    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const data = snap.exists ? (snap.data() as WindowEntry) : undefined;

      if (!data || typeof data.resetAt !== "number" || data.resetAt <= now) {
        const resetAt = now + windowMs;
        tx.set(ref, { count: 1, resetAt });
        return { count: 1, resetAt };
      }

      const count = (data.count ?? 0) + 1;
      tx.set(ref, { count, resetAt: data.resetAt });
      return { count, resetAt: data.resetAt };
    });

    const allowed = outcome.count <= rule.limit;
    return {
      allowed,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - outcome.count),
      retryAfterSeconds: Math.max(1, Math.ceil((outcome.resetAt - Date.now()) / 1000)),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Selection + helpers                                                        */
/* -------------------------------------------------------------------------- */

let limiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (limiter) return limiter;
  limiter = firestoreAvailable() ? new FirestoreRateLimiter() : new MemoryRateLimiter();
  return limiter;
}

export function rateLimitBackend(): RateLimiter["backend"] {
  return getRateLimiter().backend;
}

export function resetRateLimiterForTests() {
  limiter = null;
}

/** Stable, non-reversible bucket id; the raw ip is never stored. */
export function rateLimitKey(scope: string, clientIp: string): string {
  return createHash("sha256").update(`${scope}:${clientIp}`, "utf8").digest("base64url");
}

/**
 * Best-effort client identity. Vercel and most proxies set `x-forwarded-for`;
 * when nothing is available every caller shares one bucket, which still bounds
 * total load (the point of the limit) at the cost of fairness.
 */
export function clientIpFromHeaders(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function clientIpFrom(request: Request): string {
  return clientIpFromHeaders(request.headers);
}

export const RATE_LIMITS = {
  createDraft: { limit: 10, windowSeconds: 3600 },
  upload: { limit: 30, windowSeconds: 3600 },
  serveUpload: { limit: 600, windowSeconds: 600 },
  readLetter: { limit: 120, windowSeconds: 600 },
  publish: { limit: 30, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Applies a rule to a request. Returns the numbers so a route can set headers,
 * and `allowed: false` when the caller should be rejected with 429.
 */
export async function enforceRateLimit(
  request: Request,
  scope: keyof typeof RATE_LIMITS,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[scope];
  const key = rateLimitKey(scope, clientIpFrom(request));
  return getRateLimiter().hit(key, rule);
}

/** Standard headers so clients can back off without guessing. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (!result.allowed) headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}
