/**
 * Published links are permanent. An experience or response remains accessible
 * until it is explicitly revoked or deleted by its author, or removed by a
 * platform administrator.
 *
 * Expiry helper functions are retained for migration and legacy backwards-compatibility.
 */
export const MIN_LINK_DAYS = 1;
export const MAX_LINK_DAYS = 7;
export const DEFAULT_LINK_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Coerces any input into a whole number of days inside the allowed window. */
export function normalizeDurationDays(value: unknown): number {
  const numeric = typeof value === "number" ? Math.floor(value) : Number.NaN;
  if (!Number.isFinite(numeric)) return DEFAULT_LINK_DAYS;
  return Math.min(MAX_LINK_DAYS, Math.max(MIN_LINK_DAYS, numeric));
}

export function computeExpiresAt(days: number, from: Date = new Date()): string {
  return new Date(from.getTime() + normalizeDurationDays(days) * DAY_MS).toISOString();
}

export function isExpired(expiresAt: string | undefined, now: number = Date.now()): boolean {
  if (!expiresAt) return true;
  const parsed = Date.parse(expiresAt);
  return !Number.isFinite(parsed) || parsed <= now;
}

/**
 * A published link is live as long as its status is "published".
 * Under the permanent-link architecture, published links never automatically expire.
 */
export function isLinkLive(
  status: string | undefined,
  _expiresAt?: string,
  _now?: number,
): boolean {
  void _expiresAt;
  void _now;
  return status === "published";
}

/**
 * A response link is live if and only if both the response itself and its parent
 * experience are published. If the parent experience is revoked or deleted, the
 * response is immediately inaccessible.
 */
export function isResponseLive(
  responseStatus: string | undefined,
  parentStatus: string | undefined,
): boolean {
  return responseStatus === "published" && parentStatus === "published";
}

/** Whole days left, rounded up; 0 once expired. */
export function daysRemaining(expiresAt: string | undefined, now: number = Date.now()): number {
  if (!expiresAt) return 0;
  const parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed) || parsed <= now) return 0;
  return Math.ceil((parsed - now) / DAY_MS);
}

export function formatExpiry(expiresAt: string | undefined, locale?: string): string {
  if (!expiresAt) return "—";
  const parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(days: number): string {
  const safe = normalizeDurationDays(days);
  return safe === 1 ? "1 day" : `${safe} days`;
}
