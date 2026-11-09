import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/** URL-safe, cryptographically random identifier. Never sequential. */
export function randomId(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Public share token: 32 random bytes (≈43 base64url chars, 256 bits).
 *
 * Only the SHA-256 hash is persisted, so a database read cannot yield a working
 * link. The trade-off is deliberate: a token cannot be recovered after it is
 * issued, so renewal mints a new one.
 */
export function createLinkToken(): string {
  return randomId(32);
}

/** Retained for non-link identifiers (asset ids, object-key suffixes). */
export function createAccessToken(): string {
  return randomId(20);
}

/**
 * Creator identity key. Stored only in an httpOnly cookie; the server keeps a
 * hash so a leaked database cannot be used to impersonate a creator.
 */
export function createOwnerKey(): string {
  return randomId(32);
}

export function hashOwnerKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}

/**
 * Token hashing. A fast hash is appropriate here because the input is 256 bits
 * of CSPRNG output — there is no dictionary to attack, so a slow KDF would only
 * add latency to every recipient request.
 */
export function hashLinkToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Buffer-level comparison, for header secrets that must not short-circuit. */
export function safeCompare(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.byteLength !== b.byteLength) return false;
  return timingSafeEqual(a, b);
}
