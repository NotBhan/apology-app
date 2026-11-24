"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PLATFORM_COPY } from "@/platform/content";
import { getTheme } from "@/themes/registry";
import { getStickerPack } from "@/sticker-packs/registry";
import { resolveSituationLabel } from "@/content/situations";
import { deleteDraftAction, publishDraftAction, revokeDraftAction } from "@/app/create/actions";
import { daysRemaining, formatDuration, formatExpiry, isExpired } from "@/lib/expiry";
import { useMounted } from "@/hooks/useMounted";
import { Icon } from "@/components/ui/icons";
import { ShareQrDialog } from "@/components/share/ShareQrDialog";
import { resolveEmotionBadge } from "@/experiences/emotion";
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
  const [expiresAt, setExpiresAt] = useState(draft.expiresAt);
  const [confirming, setConfirming] = useState<null | "revoke" | "delete">(null);
  const [renewed, setRenewed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const theme = getTheme(draft.themeId);
  const pack = getStickerPack(draft.stickerPackId);

  const expired = status === "published" && isExpired(expiresAt);
  const remaining = daysRemaining(expiresAt);
  const renewable = expired && !cleanupPending;

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

  /** Re-publishes with the window the sender already chose, same token. */
  function renew() {
    startTransition(async () => {
      const result = await publishDraftAction(draft.id, draft.linkDurationDays);
      if (result.ok && result.data) {
        setStatus("published");
        setExpiresAt(result.data.expiresAt);
        setRenewed(true);
      } else {
        setNotice(result.error ?? "This letter can no longer be renewed.");
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
            <StatusPill status={status} expired={expired} cleanupPending={cleanupPending} />
          </div>
          <p className="mt-0.5 text-[0.74rem] text-[#8a7a9c]">
            {theme.name} · {pack.name} ·{" "}
            {resolveSituationLabel(draft.situation, draft.situationCustom)}
          </p>

          {status === "published" ? (
            <p
              className={`mt-0.5 text-[0.68rem] ${
                expired ? "font-semibold text-[#a8556b]" : "text-[#3f7a4a]"
              }`}
            >
              {/* Dates are timezone-dependent; render them after mount only. */}
              {!mounted
                ? expired
                  ? "Link expired"
                  : "Link active"
                : expired
                  ? cleanupPending
                    ? "Expired — files being deleted"
                    : "Expired — awaiting cleanup"
                  : remaining <= 1
                    ? `Expires tomorrow · ${formatExpiry(expiresAt)}`
                    : `${remaining} days remaining · ${formatExpiry(expiresAt)}`}
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
            background: `conic-gradient(from 210deg, ${theme.palette.primary}, ${theme.palette.secondary}, ${theme.palette.accent})`,
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={draft.experienceType === "birthday" ? `/create/birthday?draftId=${draft.id}` : `/create/${draft.id}`}
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
          onClick={() => {
            startTransition(async () => {
              setNotice(null);
              setSharing(true);
              const result = await publishDraftAction(draft.id, draft.linkDurationDays);
              setSharing(false);
              if (result.ok && result.data) {
                setStatus("published");
                setExpiresAt(result.data.expiresAt);
                setSharePath(result.data.path);
              } else {
                setNotice(result.error ?? "Could not generate share link.");
              }
            });
          }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#6d3fa8] px-3.5 text-[0.74rem] font-semibold text-white shadow-sm transition hover:bg-[#5b3290] disabled:opacity-50 cursor-pointer motion-safe:active:scale-95"
        >
          <Icon name="share" size={13} />
          <span>{sharing ? "Preparing…" : status === "published" && !expired ? "Share / QR" : "Share"}</span>
        </button>

        {renewable ? (
          <button
            type="button"
            disabled={pending}
            onClick={renew}
            className="inline-flex min-h-9 items-center rounded-full bg-[#6d3fa8] px-3 text-[0.74rem] font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Renewing…" : `Renew ${formatDuration(draft.linkDurationDays)}`}
          </button>
        ) : null}

        {status === "published" && !expired ? (
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
                : (expData.messages as Record<string, unknown> | undefined)?.message1
                  ? String((expData.messages as Record<string, unknown>).message1)
                  : "Created a complete experience";

              return (
                <div key={resp.id} className="rounded-2xl border border-[#ede3f5] bg-[#faf6ff] p-3 text-xs">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="rounded-full bg-[#f3eafc] px-2.5 py-0.5 text-[0.68rem] font-bold text-[#6d3fa8] border border-[#e4d3f5]">
                      Experience Reply: {expType === "birthday" ? "Birthday" : "Apology"}
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/responses/assets/${pId}`}
                          alt={`Attachment ${idx + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
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

      {renewed ? (
        <p className="mt-2 rounded-xl bg-[#f0f8f2] px-3 py-2 text-[0.72rem] text-[#3f7a4a]">
          Link renewed — live until {formatExpiry(expiresAt)}.
        </p>
      ) : null}

      {notice ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50/90 px-3 py-2 text-[0.72rem] text-amber-900 border border-amber-200">
          <span>{notice}</span>
          {notice.includes("messages") || notice.includes("parts") ? (
            <Link
              href={`/create/${draft.id}?step=publish`}
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
              ? "Revoking stops the link from opening for anyone. The letter and its files stay until the link expires."
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
  expired,
  cleanupPending,
}: {
  status: ApologyDraft["status"];
  expired: boolean;
  cleanupPending: boolean;
}) {
  const map = {
    draft: { label: "Draft", className: "bg-[#f4eefb] text-[#7c6892]" },
    published: expired
      ? {
          label: cleanupPending ? "Deleting" : "Expired",
          className: "bg-[#fdf1f3] text-[#a8556b]",
        }
      : { label: "Live", className: "bg-[#e8f5ec] text-[#3f7a4a]" },
    revoked: { label: "Revoked", className: "bg-[#fdf1f3] text-[#a8556b]" },
    deleted: { label: "Deleting", className: "bg-[#fdf1f3] text-[#a8556b]" },
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
