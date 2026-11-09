import "server-only";
import { cookies } from "next/headers";
import { createOwnerKey, hashOwnerKey } from "@/lib/id";
import { authConfigured, getAuth } from "@/lib/auth/server";

export const OWNER_COOKIE = "kk_owner";

export interface Owner {
  key: string;
  hash: string;
  /** Set when the caller presented a verified Neon Auth session. */
  userId?: string;
}

/**
 * Creator identity.
 *
 * Order matters:
 *
 * 1. **A verified Neon Auth session wins.** The scope key is derived from the
 *    user id, so the same account owns the same records on every device. The
 *    key is a SHA-256 of `user:<id>`; it is a foreign key, not a credential —
 *    a caller cannot present it without a session that the server verified.
 * 2. **The legacy `kk_owner` cookie is honoured read-only.** Records written
 *    before auth are bound to it and must stay reachable.
 * 3. Minting a new legacy cookie at create time is the remaining anonymous
 *    path. It disappears when `NEON_AUTH_ENFORCE=1` lands with 401 handling in
 *    the API routes.
 */
async function sessionOwner(): Promise<Owner | undefined> {
  if (!authConfigured()) return undefined;

  try {
    const { data } = await getAuth().getSession();
    const userId = data?.user?.id;
    if (!userId) return undefined;
    const hash = hashOwnerKey(`user:${userId}`);
    return { key: `user:${userId}`, hash, userId };
  } catch {
    // A provider outage must not be mistaken for "signed in".
    return undefined;
  }
}

async function cookieOwner(): Promise<Owner | undefined> {
  const jar = await cookies();
  const existing = jar.get(OWNER_COOKIE)?.value;
  if (!existing || existing.length < 20) return undefined;
  return { key: existing, hash: hashOwnerKey(existing) };
}

export async function getOwner(): Promise<Owner | undefined> {
  return (await sessionOwner()) ?? (await cookieOwner());
}

/**
 * Reads the creator identity key. If none exists, a new one is minted.
 *
 * Route handlers are the only callers. The key lives in an httpOnly cookie and
 * the database stores only its SHA-256 hash, so a database leak cannot be used
 * to edit someone's drafts.
 */
export async function getOrCreateOwner(): Promise<Owner> {
  const existing = await getOwner();
  if (existing) return existing;

  const key = createOwnerKey();
  const jar = await cookies();
  jar.set(OWNER_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { key, hash: hashOwnerKey(key) };
}
