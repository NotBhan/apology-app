import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashOwnerKey } from "@/lib/id";
import { authConfigured, getAuth } from "@/lib/auth/server";
import { OWNER_COOKIE } from "@/lib/security/owner";
import { jsonError } from "@/lib/api/responses";
import { safeCallback } from "./callback";

export { safeCallback };

/**
 * The single place creator identity is decided.
 *
 * A Neon Auth session is the only thing that grants access. The legacy cookie
 * is carried alongside purely as an ownership *filter* for records written
 * before auth existed — it never authenticates on its own.
 */
export interface Creator {
  userId: string;
  /** Scope key used by the repository predicates. */
  key: string;
  /** Present only when this browser still holds a pre-auth `kk_owner` cookie. */
  legacyKey?: string;
}

export function signInUrl(callbackURL: string): string {
  return `/auth/sign-in?callbackURL=${encodeURIComponent(safeCallback(callbackURL))}`;
}

export async function getCreator(): Promise<Creator | undefined> {
  if (!authConfigured()) return undefined;

  let userId: string | undefined;
  try {
    const { data } = await getAuth().getSession();
    userId = data?.user?.id;
  } catch {
    // A provider outage is "not signed in", never a pass.
    return undefined;
  }
  if (!userId) return undefined;

  const jar = await cookies();
  const legacy = jar.get(OWNER_COOKIE)?.value;
  const legacyKey = legacy && legacy.length >= 20 ? hashOwnerKey(legacy) : undefined;

  return { userId, key: hashOwnerKey(`user:${userId}`), legacyKey };
}

/** Page guard: redirects to sign-in and remembers where the user was going. */
export async function requirePageCreator(pathname: string): Promise<Creator> {
  const creator = await getCreator();
  if (!creator) redirect(signInUrl(pathname));
  return creator;
}

/** API guard: 401 rather than a redirect, so callers can react to it. */
export async function requireApiCreator(): Promise<
  { ok: true; creator: Creator } | { ok: false; response: Response }
> {
  const creator = await getCreator();
  if (!creator) {
    return { ok: false, response: jsonError(401, "Sign in to continue.") };
  }
  return { ok: true, creator };
}
