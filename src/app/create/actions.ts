"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOwner } from "@/lib/security/owner";
import { getCreator } from "@/lib/security/creator";
import { getObjectStore, getRepository } from "@/lib/storage";
import { constantTimeEqual } from "@/lib/id";
import { sanitiseStorageError } from "@/lib/storage/filebase-errors";
import {
  draftPayloadSchema,
  formatZodError,
} from "@/lib/validation/apology";
import { validateDraftForPublish } from "@/lib/validation/publish";
import { toCreatorDraft } from "@/lib/storage/types";
import {
  RATE_LIMITS,
  clientIpFromHeaders,
  getRateLimiter,
  rateLimitKey,
} from "@/lib/security/postgres-rate-limit";
import type { ApologyDraft } from "@/types/apology";

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  fields?: Record<string, string>;
}

export interface PublishResult {
  /**
   * The plaintext link token, present only when this call minted it.
   *
   * A repeat publish of an already-published record keeps the token the
   * recipient already holds, and the plaintext is unrecoverable by design. In
   * that case `token` and `path` are empty and `alreadyPublished` is true: the
   * link that was already sent continues to work.
   */
  token: string;
  path: string;
  alreadyPublished: boolean;
}

export async function startDraftAction(): Promise<void> {
  const requestHeaders = await headers();
  const limit = await getRateLimiter().hit(
    rateLimitKey("createDraft", clientIpFromHeaders(requestHeaders)),
    RATE_LIMITS.createDraft,
  );
  if (!limit.allowed) redirect("/create?limited=1");

  const creator = await getCreator();
  if (!creator) redirect("/auth/sign-in?callbackURL=%2Fcreate");

  const record = await getRepository().createDraft(
    { userId: creator.userId, scopeKey: creator.key, legacyKey: creator.legacyKey },
    {
      recipientName: "",
      senderName: "",
    },
  );
  redirect(`/create/${record.id}`);
}

export async function saveDraftAction(
  id: string,
  payload: unknown,
): Promise<ActionResult<ApologyDraft>> {
  const parsed = draftPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields need attention.",
      fields: formatZodError(parsed.error),
    };
  }

  const owner = await getOwner();
  if (!owner) return { ok: false, error: "This draft belongs to another browser." };

  try {
    const record = await getRepository().saveDraft(id, owner.hash, parsed.data);
    revalidatePath("/manage");
    return { ok: true, data: toCreatorDraft(record) };
  } catch (cause) {
    return { ok: false, error: mapRepoError(cause) };
  }
}

export async function publishDraftAction(
  id: string,
): Promise<ActionResult<PublishResult>> {
  const owner = await getOwner();
  if (!owner) return { ok: false, error: "This draft belongs to another browser." };

  const repository = getRepository();
  const existing = await repository.getDraft(id);
  if (!existing) return { ok: false, error: "That draft no longer exists." };
  if (!constantTimeEqual(existing.ownerKeyHash, owner.hash)) {
    return { ok: false, error: "This draft belongs to another browser." };
  }

  const validation = validateDraftForPublish(existing);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error,
      fields: validation.fields,
    };
  }

  const isRenewal = existing.status === "published" || existing.status === "revoked";
  if (isRenewal) {
    const assets = await repository.listAssets(id);
    if (assets.length > 0) {
      const objects = getObjectStore();
      for (const asset of assets) {
        try {
          const head = await objects.head(asset.objectKey);
          if (!head.exists) {
            return {
              ok: false,
              error:
                "One of this letter's files is no longer stored. Remove and re-upload it before republishing.",
            };
          }
        } catch (error) {
          return {
            ok: false,
            error: `Could not verify stored files (${sanitiseStorageError(error)}). Try again.`,
          };
        }
      }
    }
  }

  try {
    const record = await repository.publish(id, owner.hash);
    revalidatePath("/manage");
    const token = record.accessToken;
    return {
      ok: true,
      data: {
        token,
        path: token ? `/letter/${token}` : "",
        // No plaintext token means the existing link was preserved. The caller
        // must not present "this is your new link" in that case.
        alreadyPublished: !token,
      },
    };
  } catch (cause) {
    return { ok: false, error: mapRepoError(cause) };
  }
}

export async function revokeDraftAction(id: string): Promise<ActionResult<null>> {
  const owner = await getOwner();
  if (!owner) return { ok: false, error: "Not your letter." };
  try {
    await getRepository().revoke(id, owner.hash);
    revalidatePath("/manage");
    return { ok: true, data: null };
  } catch (cause) {
    return { ok: false, error: mapRepoError(cause) };
  }
}

export async function deleteDraftAction(id: string): Promise<ActionResult<null>> {
  const owner = await getOwner();
  if (!owner) return { ok: false, error: "Not your letter." };
  try {
    const marked = await getRepository().requestDeletionByOwner(id, owner.hash);
    revalidatePath("/manage");
    if (!marked) return { ok: false, error: "This letter can no longer be edited." };
    return { ok: true, data: null };
  } catch (cause) {
    return { ok: false, error: mapRepoError(cause) };
  }
}

function mapRepoError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : "";
  if (message === "NOT_FOUND") return "That draft no longer exists.";
  if (message === "FORBIDDEN") return "This draft belongs to another browser.";
  if (message === "REVOKED") return "This letter was revoked.";
  if (message === "DELETED") return "This letter has been deleted and cannot be renewed.";
  if (message === "NOT_EDITABLE") return "This letter can no longer be edited.";
  return "Something went wrong. Try again.";
}
