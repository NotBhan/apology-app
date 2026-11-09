/**
 * Security headers, built in one place so the policy can be tested rather than
 * copy-pasted into config.
 *
 * Resource audit (what the browser actually loads):
 *
 * - Fonts: `next/font` downloads and self-hosts them at build time, so they are
 *   served from `/_next/static`. No fonts.googleapis.com or gstatic.com at runtime.
 * - Scripts/styles: same origin only. Next injects inline bootstrap/flight data,
 *   so `'unsafe-inline'` is required for scripts; styles are inline throughout
 *   the theme system, so the same applies there.
 * - Images: `/api/uploads/*` (same origin), plus `data:` and `blob:` for local
 *   previews before upload.
 * - Audio: `/audio/*.mp3` (same origin).
 * - Network: no third-party APIs are called from the browser. Firebase Admin is
 *   server-only, which is why no firebase domain appears in `connect-src`.
 *
 * `'unsafe-eval'` is added only in development: React Refresh needs it, the
 * production bundle does not.
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

export interface HeaderOptions {
  /** Production enables HSTS and drops the dev-only eval allowance. */
  production: boolean;
}

export function buildContentSecurityPolicy({ production }: HeaderOptions): string {
  const scriptSrc = production
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    // Turbopack/worker chunks in development; harmless to allow in both.
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Clickjacking: a private letter must never render inside someone's frame.
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function buildSecurityHeaders(options: HeaderOptions): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
    // Legacy companion to frame-ancestors for older browsers.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Private tokens live in the URL path; never leak them to another origin.
    { key: "Referrer-Policy", value: "no-referrer" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ];

  if (options.production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
