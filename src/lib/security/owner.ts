import "server-only";
import { cookies } from "next/headers";
import { createOwnerKey, hashOwnerKey } from "@/lib/id";

export const OWNER_COOKIE = "kk_owner";

/**
 * Reads the creator identity key. If none exists, a new one is minted.
 *
 * Route handlers are the only callers. The key lives in an httpOnly cookie and
 * the database stores only its SHA-256 hash, so a database leak cannot be used
 * to edit someone's drafts.
 */
export async function getOrCreateOwner(): Promise<{ key: string; hash: string }> {
  const jar = await cookies();
  const existing = jar.get(OWNER_COOKIE)?.value;
  if (existing && existing.length >= 20) {
    return { key: existing, hash: hashOwnerKey(existing) };
  }
  const key = createOwnerKey();
  jar.set(OWNER_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { key, hash: hashOwnerKey(key) };
}

export async function getOwner(): Promise<{ key: string; hash: string } | undefined> {
  const jar = await cookies();
  const existing = jar.get(OWNER_COOKIE)?.value;
  if (!existing) return undefined;
  return { key: existing, hash: hashOwnerKey(existing) };
}
