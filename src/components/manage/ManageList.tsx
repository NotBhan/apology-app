"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PLATFORM_COPY } from "@/platform/content";
import { getTheme } from "@/themes/registry";
import { getStickerPack } from "@/sticker-packs/registry";
import { resolveSituationLabel } from "@/content/situations";
import { deleteDraftAction, publishDraftAction, revokeDraftAction } from "@/app/create/actions";
import { useMounted } from "@/hooks/useMounted";
import { Icon } from "@/components/ui/icons";
import { OptimizedPhoto } from "@/components/ui/OptimizedPhoto";
import { ShareQrDialog } from "@/components/share/ShareQrDialog";
import { resolveEmotionBadge } from "@/experiences/emotion";
import { birthdayContentSchema } from "@/experiences/birthday/schema";
import { resolveBirthdayTheme } from "@/experiences/birthday/themes";
import { missYouContentSchema } from "@/experiences/miss-you/schema";
import { resolveMissYouTheme } from "@/experiences/miss-you/themes";
import type { ApologyDraft } from "@/types/apology";
import type { DeletionTombstone } from "@/lib/lifecycle/types";
import type { PublishedResponse, QuickReplyPayload, ExperienceReplyPayload } from "@/types/response";

export interface ManageListProps {
  drafts: ApologyDraft[];
  tombstones: DeletionTombstone[];
  /** Draft ids whose cleanup has started but not finished. */
  pendingDeletionIds: string[];
  responsesByApology?: Record<string, PublishedResponse[]>;
}

export function ManageList({ drafts, tombstones, pendingDeletionIds, responsesByApology }: ManageListProps) {
  const pending = new Set(pendingDeletionIds);

  if (drafts.length === 0 && tombstones.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#ddd0ec] px-6 py-14 text-center">
        <h2 className="text-[1.05rem] font-semibold text-[#33203f]">
          {PLATFORM_COPY.dashboard.emptyHeading}
        </h2>
        <p className="mx-auto mt-2 max-w-[38ch] text-[0.86rem] leading-relaxed text-[#6b5580]">
          {PLATFORM_COPY.dashboard.emptyBody}
        </p>
        <Link
          href="/explore"
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-[#6d3fa8] px-6 text-[0.85rem] font-semibold text-white"
        >
          {PLATFORM_COPY.dashboard.emptyCta}
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {drafts.map((draft) => (
        <ManageRow
          key={draft.id}
          draft={draft}
          cleanupPending={pending.has(draft.id)}
          responses={responsesByApology?.[draft.id] ?? []}
        />
      ))}
      {tombstones.map((tombstone) => (
        <DeletedRow key={tombstone.apologyId} tombstone={tombstone} />
      ))}
    </ul>
  );
}

function ManageRow({
  draft,
  cleanupPending,
  responses = [],
}: {
  draft: ApologyDraft;
  cleanupPending: boolean;
  responses?: PublishedResponse[];
}) {
  const mounted = useMounted();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(draft.status);
  const [confirming, setConfirming] = useState<null | "revoke" | "delete">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const experienceType = draft.experienceType ?? "apology";
  const editHref =
    experienceType === "birthday"
      ? `/create/birthday?draftId=${draft.id}`
      : experienceType === "miss-you"
        ? `/create/miss-you?draftId=${draft.id}`
        : `/create/${draft.id}`;

  const theme = getTheme(draft.themeId);
  const pack = getStickerPack(draft.stickerPackId);

  let rowSubtitle = `${theme.name} · ${pack.name} · ${resolveSituationLabel(
    draft.situation,
    draft.situationCustom,
  )}`;
  let swatchColors: [string, string, string] = [
    theme.palette.primary,
    theme.palette.secondary,
    theme.palette.accent,
  ];

  if (experienceType === "miss-you") {
    const parsed = missYouContentSchema.safeParse(draft.content);
    const missTheme = resolveMissYouTheme(parsed.success ? parsed.data.themeId : undefined);
    swatchColors = [missTheme.palette.primary, missTheme.palette.secondary, missTheme.palette.accent];
    rowSubtitle = parsed.success && parsed.data.distanceNote
      ? `${missTheme.name} · I Miss You · ${parsed.data.distanceNote}`
      : `${missTheme.name} · I Miss You`;
  } else if (experienceType === "birthday") {
    const parsed = birthdayContentSchema.safeParse(draft.content);
    const bdayTheme = resolveBirthdayTheme(parsed.success ? parsed.data.themeId : undefined);
    swatchColors = [bdayTheme.palette.primary, bdayTheme.palette.secondary, bdayTheme.palette.accent];
    rowSubtitle = `${bdayTheme.name} · Happy Birthday`;
  }

  // A published link never expires on its own. Only the author's explicit
  // revoke (or a queued deletion) takes it out of service.
  const live = status === "published";

  function act(kind: "revoke" | "delete") {
    startTransition(async () => {
      if (kind === "revoke") {
        const result = await revokeDraftAction(draft.id);
        if (result.ok) {
          setStatus("revoked");
          setConfirming(null);
        }
        return;
      }

      const result = await deleteDraftAction(draft.id);
      if (result.ok) {
        setConfirming(null);
        setNotice("Deleting… this row will disappear once the files are gone.");
      } else {
        setNotice(result.error ?? "Deletion could not start.");
      }
    });
  }

  /** Opens the share dialog without rotating the link already sent. */
  function share() {
    startTransition(async () => {
      setNotice(null);
      setSharing(true);
      const result = await publishDraftAction(draft.id);
      setSharing(false);
      if (result.ok && result.data) {
        setStatus("published");
        if (result.data.path) {
          setSharePath(result.data.path);
        } else {
          // The record was already published, so this call preserved the token
          // it issued earlier. The plaintext cannot be recovered by design; the
          // link the recipient already holds is still live.
          setNotice(
            "This link is already live and unchanged. If you no longer have it, revoke and republish to issue a new one.",
          );
        }
      } else {
        setNotice(result.error ?? "Could not generate share link.");
      }
    });
  }

  return (
    <li className="rounded-3xl border border-[#ece2f6] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[1rem] font-semibold text-[#33203f]">
              {draft.recipientName || "Untitled letter"}
            </h2>
            <StatusPill status={status} cleanupPending={cleanupPending} />
          </div>
          <p className="mt-0.5 text-[0.74rem] text-[#8a7a9c]">{rowSubtitle}</p>

          {status === "published" ? (
            <p className="mt-0.5 text-[0.68rem] text-[#3f7a4a]">
              {/* Dates are timezone-dependent; render them after mount only. */}
              {!mounted
                ? "Link active"
                : cleanupPending
                  ? "Deleting — files being removed"
                  : "Live · stays active until you revoke or delete it"}
            </p>
          ) : (
            <p className="mt-0.5 text-[0.68rem] text-[#b3a5c2]">
              {mounted
                ? `updated ${new Date(draft.updatedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}`
                : "updated"}
            </p>
          )}
        </div>
        <span
          aria-hidden
          className="mt-1 h-8 w-8 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(from 210deg, ${swatchColors[0]}, ${swatchColors[1]}, ${swatchColors[2]})`,
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={editHref}
          className="inline-flex min-h-9 items-center rounded-full bg-[#f2ecfa] px-3 text-[0.74rem] font-semibold text-[#5b3f7d]"
        >
          Edit
        </Link>
        <Link
          href={`/preview/${draft.id}`}
          className="inline-flex min-h-9 items-center rounded-full bg-[#f2ecfa] px-3 text-[0.74rem] font-semibold text-[#5b3f7d]"
        >
          Preview
        </Link>
        <button
          type="button"
          disabled={pending || sharing}
          onClick={share}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#6d3fa8] px-3.5 text-[0.74rem] font-semibold text-white shadow-sm transition hover:bg-[#5b3290] disabled:opacity-50 cursor-pointer motion-safe:active:scale-95"
        >
          <Icon name="share" size={13} />
          <span>{sharing ? "Preparing…" : live ? "Share / QR" : "Share"}</span>
        </button>

        {live ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming("revoke")}
            className="inline-flex min-h-9 items-center rounded-full border border-[#f0d6dd] px-3 text-[0.74rem] font-semibold text-[#a8556b] disabled:opacity-50"
          >
            Revoke link
          </button>
        ) : null}

        {responses.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowReplies((prev) => !prev)}
            aria-expanded={showReplies}
            aria-controls={`replies-list-${draft.id}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#f2eafc] px-3 text-[0.74rem] font-semibold text-[#6d3fa8] transition hover:bg-[#ebdcf8] motion-safe:active:scale-95"
          >
            <Icon name="message" size={13} />
            <span>Replies ({responses.length})</span>
          </button>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming("delete")}
          className="inline-flex min-h-9 items-center rounded-full border border-[#ece2f6] px-3 text-[0.74rem] font-semibold text-[#8a7a9c] disabled:opacity-50 motion-safe:active:scale-95"
        >
          Delete now
        </button>
      </div>

      {showReplies && responses.length > 0 ? (
        <div id={`replies-list-${draft.id}`} className="mt-4 border-t border-[#f0e8f7] pt-3 space-y-2.5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#8a7a9c]">
            Incoming Responses ({responses.length})
          </p>
          {responses.map((resp) => {
            if (resp.responseType === "experience") {
              const expPayload = resp.content as ExperienceReplyPayload;
              const expType = expPayload?.experienceType;
              const expData = (expPayload?.content ?? {}) as Record<string, unknown>;
              const sender = typeof expData.senderName === "string" ? expData.senderName : (draft.recipientName || "Recipient");
              const headline = typeof expData.headline === "string" ? expData.headline : null;
              const message = typeof expData.message === "string"
                ? expData.message
                : typeof expData.letter === "string"
                  ? expData.letter
                  : (expData.messages as Record<string, unknown> | undefined)?.message1
                    ? String((expData.messages as Record<string, unknown>).message1)
                    : "Created a complete experience";

              return (
                <div key={resp.id} className="rounded-2xl border border-[#ede3f5] bg-[#faf6ff] p-3 text-xs">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="rounded-full bg-[#f3eafc] px-2.5 py-0.5 text-[0.68rem] font-bold text-[#6d3fa8] border border-[#e4d3f5]">
                      Experience Reply:{" "}
                      {expType === "birthday"
                        ? "Birthday"
                        : expType === "miss-you"
                          ? "I Miss You"
                          : "Apology"}
                    </span>
                    <span className="text-[0.65rem] text-[#a495b5]">
                      {mounted && resp.publishedAt
                        ? new Date(resp.publishedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </span>
                  </div>
                  <div className="mt-1">
                    <p className="text-[0.7rem] font-medium text-[#7d6892]">
                      From <span className="font-semibold text-[#33203f]">{sender}</span>
                    </p>
                    {headline ? (
                      <p className="mt-1 font-semibold text-xs text-[#33203f]">{headline}</p>
                    ) : null}
                    <p className="mt-0.5 whitespace-pre-line text-[0.8rem] leading-relaxed text-[#523d68]">
                      {message}
                    </p>
                  </div>
                </div>
              );
            }

            const replyContent = resp.content as QuickReplyPayload;
            return (
              <div key={resp.id} className="rounded-2xl border border-[#ede3f5] bg-[#faf6ff] p-3 text-xs">
                <div className="mb-1.5 flex items-center justify-between">
                  {(() => {
                    const emotionBadge = resolveEmotionBadge(draft.experienceType, replyContent.recipientEmotion);
                    return emotionBadge ? (
                      <span className="rounded-full bg-[#ebdcf8] px-2.5 py-0.5 text-[0.68rem] font-semibold text-[#6d3fa8]">
                        {emotionBadge.prefix ? `${emotionBadge.prefix}: ` : ""}{emotionBadge.label}
                      </span>
                    ) : (
                      <span className="text-[0.68rem] font-medium text-[#8a7a9c]">Quick Reply</span>
                    );
                  })()}
                  <span className="text-[0.65rem] text-[#a495b5]">
                    {mounted && resp.publishedAt
                      ? new Date(resp.publishedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                </div>
                <p className="whitespace-pre-line text-[0.8rem] leading-relaxed text-[#33203f]">
                  {replyContent.message}
                </p>
                {replyContent.photos && replyContent.photos.length > 0 ? (
                  <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                    {replyContent.photos.map((pId, idx) => (
                      <div key={pId} className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#e5d9f0]">
                        <OptimizedPhoto
                          src={`/api/responses/assets/${pId}`}
                          alt={`Attachment ${idx + 1}`}
                          compactFallback
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {notice ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50/90 px-3 py-2 text-[0.72rem] text-amber-900 border border-amber-200">
          <span>{notice}</span>
          {notice.includes("messages") || notice.includes("parts") ? (
            <Link
              href={experienceType === "apology" ? `${editHref}?step=publish` : editHref}
              className="font-bold underline text-amber-950 hover:text-amber-800"
            >
              Complete draft →
            </Link>
          ) : null}
        </div>
      ) : null}

      {sharePath ? (
        <ShareQrDialog
          path={sharePath}
          experienceType={draft.experienceType ?? "apology"}
          onClose={() => setSharePath(null)}
        />
      ) : null}

      {confirming ? (
        <div className="mt-3 rounded-2xl bg-[#faf6ff] p-3">
          <p className="text-[0.76rem] text-[#5b4a6d]">
            {confirming === "revoke"
              ? "Revoking stops the link from opening for anyone, immediately. The letter and its files stay in your account until you delete them."
              : "Deleting removes this letter, its messages and its uploaded photos and audio permanently. This cannot be undone."}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => act(confirming)}
              disabled={pending}
              className="inline-flex min-h-8 items-center rounded-full bg-[#a8556b] px-3 text-[0.72rem] font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Working…" : confirming === "revoke" ? "Yes, revoke" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="inline-flex min-h-8 items-center rounded-full px-3 text-[0.72rem] font-semibold text-[#8a7a9c]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/**
 * A letter that has been physically removed. Only an id, a date and a count
 * survive — no names, no messages, no media. That is the whole point.
 */
function DeletedRow({ tombstone }: { tombstone: DeletionTombstone }) {
  const mounted = useMounted();

  return (
    <li className="rounded-3xl border border-[#ece2f6] bg-[#faf8fc] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[0.95rem] font-semibold text-[#6b5580]">Deleted letter</h2>
            <span className="rounded-full bg-[#f1edf5] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#8a7a9c]">
              Deleted
            </span>
          </div>
          <p className="mt-0.5 text-[0.68rem] text-[#a394b4]">
            {mounted
              ? `Removed ${new Date(tombstone.deletedAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })} · ${tombstone.assetsDeleted} file${
                  tombstone.assetsDeleted === 1 ? "" : "s"
                } deleted`
              : "Removed"}
          </p>
        </div>
      </div>
    </li>
  );
}

function StatusPill({
  status,
  cleanupPending,
}: {
  status: ApologyDraft["status"];
  cleanupPending: boolean;
}) {
  const map = {
    draft: { label: "Draft", className: "bg-[#f4eefb] text-[#7c6892]" },
    published: {
      label: "Live",
      className: "bg-[#e8f5ec] text-[#3f7a4a]",
    },
    revoked: { label: "Revoked", className: "bg-[#fdf1f3] text-[#a8556b]" },
    deleted: {
      label: cleanupPending ? "Deleting" : "Deleted",
      className: "bg-[#fdf1f3] text-[#a8556b]",
    },
  } as const;
  const item = map[status];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${item.className}`}
    >
      {item.label}
    </span>
  );
}
