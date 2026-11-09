"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrCreateOwner, getOwner } from "@/lib/security/owner";
import { getObjectStore, getRepository } from "@/lib/storage";
import { sanitiseStorageError } from "@/lib/storage/filebase-errors";
import {
  draftPayloadSchema,
  formatZodError,
  linkDurationDaysSchema,
} from "@/lib/validation/apology";
import { toCreatorDraft } from "@/lib/storage/types";
import { DEFAULT_LINK_DAYS, normalizeDurationDays } from "@/lib/expiry";
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
  token: string;
  path: string;
  expiresAt: string;
  durationDays: number;
}

export async function startDraftAction(): Promise<void> {
  const requestHeaders = await headers();
  const limit = await getRateLimiter().hit(
    rateLimitKey("createDraft", clientIpFromHeaders(requestHeaders)),
    RATE_LIMITS.createDraft,
  );
  if (!limit.allowed) redirect("/create?limited=1");

  const owner = await getOrCreateOwner();
  const record = await getRepository().createDraft(owner.hash, {
    recipientName: "",
    senderName: "",
  });
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
  durationDays: unknown = DEFAULT_LINK_DAYS,
): Promise<ActionResult<PublishResult>> {
  const duration = linkDurationDaysSchema.safeParse(durationDays);
  if (!duration.success) {
    return {
      ok: false,
      error: "Choose a link lifetime between 1 and 7 days.",
      fields: { durationDays: "Pick between 1 and 7 days." },
    };
  }

  const owner = await getOwner();
  if (!owner) return { ok: false, error: "This draft belongs to another browser." };

  const repository = getRepository();
  const existing = await repository.getDraft(id);
  if (!existing) return { ok: false, error: "That draft no longer exists." };

  const parsed = draftPayloadSchema.safeParse(existing);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Add the three messages before publishing.",
      fields: formatZodError(parsed.error),
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
    const record = await repository.publish(id, owner.hash, duration.data);
    revalidatePath("/manage");
    return {
      ok: true,
      data: {
        token: record.accessToken,
        path: `/letter/${record.accessToken}`,
        expiresAt: record.expiresAt ?? "",
        durationDays: normalizeDurationDays(record.linkDurationDays),
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
