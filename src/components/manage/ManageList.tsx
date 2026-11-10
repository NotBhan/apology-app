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
import type { ApologyDraft } from "@/types/apology";
import type { DeletionTombstone } from "@/lib/lifecycle/types";

export interface ManageListProps {
  drafts: ApologyDraft[];
  tombstones: DeletionTombstone[];
  /** Draft ids whose cleanup has started but not finished. */
  pendingDeletionIds: string[];
}

export function ManageList({ drafts, tombstones, pendingDeletionIds }: ManageListProps) {
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
        <ManageRow key={draft.id} draft={draft} cleanupPending={pending.has(draft.id)} />
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
}: {
  draft: ApologyDraft;
  cleanupPending: boolean;
}) {
  const mounted = useMounted();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(draft.status);
  const [expiresAt, setExpiresAt] = useState(draft.expiresAt);
  const [confirming, setConfirming] = useState<null | "revoke" | "delete">(null);
  const [renewed, setRenewed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
          href={`/create/${draft.id}`}
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

        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming("delete")}
          className="inline-flex min-h-9 items-center rounded-full border border-[#ece2f6] px-3 text-[0.74rem] font-semibold text-[#8a7a9c] disabled:opacity-50"
        >
          Delete now
        </button>
      </div>

      {renewed ? (
        <p className="mt-2 rounded-xl bg-[#f0f8f2] px-3 py-2 text-[0.72rem] text-[#3f7a4a]">
          Link renewed — live until {formatExpiry(expiresAt)}.
        </p>
      ) : null}

      {notice ? (
        <p className="mt-2 rounded-xl bg-[#faf6ff] px-3 py-2 text-[0.72rem] text-[#5b4a6d]">
          {notice}
        </p>
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
