export const DEFAULT_DESTINATION = "/my-letters";

/**
 * Rejects open redirects.
 *
 * Only a same-origin absolute path survives: a scheme (`https:`), a
 * protocol-relative host (`//evil`), or a backslash variant (`/\\evil`, which
 * some browsers normalise to `//`) all fall back to the dashboard.
 */
export function safeCallback(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return DEFAULT_DESTINATION;
  }
  return raw;
}
