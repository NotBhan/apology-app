import { randomBytes, createHash } from "node:crypto";

/** URL-safe, cryptographically random identifier. Never sequential. */
export function randomId(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

/** Public share token. 20 bytes ≈ 27 chars of entropy — unguessable. */
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

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
