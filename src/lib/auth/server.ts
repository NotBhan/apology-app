import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth server instance.
 *
 * Constructed lazily so `next build` does not require the auth secret: the
 * route handler and the proxy both import this module, and an eager
 * `createNeonAuth()` here would make route collection fail in any environment
 * without `NEON_AUTH_COOKIE_SECRET`.
 *
 * `cookies.domain` is deliberately unset. The application is served from a
 * single host — the custom domain and its `.vercel.app` alias — so a
 * cross-subdomain cookie would widen exposure for no benefit.
 */
let instance: NeonAuth | null = null;

export function authConfigured(): boolean {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}

export function getAuth(): NeonAuth {
  if (instance) return instance;

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret) {
    throw new Error("Neon Auth is not configured: NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are required.");
  }

  instance = createNeonAuth({
    baseUrl,
    cookies: {
      secret,
      // Cache the verified session for five minutes to avoid a round trip on
      // every render; revocation is still enforced by the upstream call.
      sessionDataTtl: 300,
    },
  });

  return instance;
}

export function resetAuthForTests() {
  instance = null;
}
