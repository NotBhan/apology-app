/**
 * Published links are permanent.
 *
 * A published experience or response stays accessible until its author
 * explicitly revokes it or requests deletion, or a platform administrator
 * removes it. There is no automatic expiry, TTL or duration anywhere on the
 * read path.
 *
 * `MIN_LINK_DAYS` / `MAX_LINK_DAYS` / `normalizeDurationDays` survive only to
 * read and validate the legacy `link_duration_days` column that older rows and
 * older clients still carry. They never gate access.
 */
export const MIN_LINK_DAYS = 1;
export const MAX_LINK_DAYS = 7;
export const DEFAULT_LINK_DAYS = 3;

/** Coerces legacy input into a whole number of days inside the allowed window. */
export function normalizeDurationDays(value: unknown): number {
  const numeric = typeof value === "number" ? Math.floor(value) : Number.NaN;
  if (!Number.isFinite(numeric)) return DEFAULT_LINK_DAYS;
  return Math.min(MAX_LINK_DAYS, Math.max(MIN_LINK_DAYS, numeric));
}

/**
 * The single liveness predicate for a published experience.
 *
 * Status is the only thing that decides access. `expires_at` is intentionally
 * ignored: every permanent link has no expiry, and treating a missing value as
 * dead is what made live links look expired.
 */
export function isLinkLive(status: string | undefined): boolean {
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
