/**
 * Published links are deliberately temporary. A sender chooses a window of
 * 1–7 days; after it passes the link stops resolving and behaves exactly like
 * an unknown token, so an expired link reveals nothing about whether it ever
 * existed.
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
 * A published link is live only while it has an expiry that is still in the
 * future. A missing expiry is treated as dead rather than immortal, so a record
 * can never accidentally become permanent.
 */
export function isLinkLive(
  status: string | undefined,
  expiresAt: string | undefined,
  now: number = Date.now(),
): boolean {
  return status === "published" && !isExpired(expiresAt, now);
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
