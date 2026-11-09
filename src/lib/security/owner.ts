import "server-only";
import { cookies } from "next/headers";
import { hashOwnerKey } from "@/lib/id";
import { getCreator } from "@/lib/security/creator";

export const OWNER_COOKIE = "kk_owner";

export interface Owner {
  key: string;
  hash: string;
  userId?: string;
}

/**
 * Owner shim.
 *
 * Kept as the repository-facing shape while call sites migrate to
 * `requireApiCreator()`. A verified session is required: there is no minting
 * path any more, so an anonymous caller gets `UNAUTHENTICATED` instead of a
 * fresh identity.
 */
export class UnauthenticatedError extends Error {
  constructor() {
    super("UNAUTHENTICATED");
    this.name = "UnauthenticatedError";
  }
}

export async function getOwner(): Promise<Owner | undefined> {
  const creator = await getCreator();
  if (!creator) return undefined;
  return { key: creator.userId, hash: creator.key, userId: creator.userId };
}

export async function getOrCreateOwner(): Promise<Owner> {
  const owner = await getOwner();
  if (!owner) throw new UnauthenticatedError();
  return owner;
}

export async function getLegacyOwnerHash(): Promise<string | undefined> {
  const jar = await cookies();
  const value = jar.get(OWNER_COOKIE)?.value;
  if (!value || value.length < 20) return undefined;
  return hashOwnerKey(value);
}
