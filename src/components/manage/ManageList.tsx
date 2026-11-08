"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getTheme } from "@/themes/registry";
import { getStickerPack } from "@/sticker-packs/registry";
import { resolveSituationLabel } from "@/content/situations";
import {
  deleteDraftAction,
  publishDraftAction,
  revokeDraftAction,
} from "@/app/create/actions";
import { daysRemaining, formatDuration, formatExpiry, isExpired } from "@/lib/expiry";
import { useMounted } from "@/hooks/useMounted";
import type { ApologyDraft } from "@/types/apology";

export function ManageList({ drafts }: { drafts: ApologyDraft[] }) {
  if (drafts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#ddd0ec] px-6 py-14 text-center">
        <p className="text-[0.9rem] text-[#6b5580]">No letters yet.</p>
        <Link
          href="/create"
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-[#6d3fa8] px-6 text-[0.85rem] font-semibold text-white"
        >
          Start your first one
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {drafts.map((draft) => (
        <ManageRow key={draft.id} draft={draft} />
      ))}
    </ul>
  );
}

function ManageRow({ draft }: { draft: ApologyDraft }) {
  const mounted = useMounted();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(draft.status);
  const [expiresAt, setExpiresAt] = useState(draft.expiresAt);
  const [confirming, setConfirming] = useState<null | "revoke" | "delete">(null);
  const [renewed, setRenewed] = useState(false);
  const theme = getTheme(draft.themeId);
  const pack = getStickerPack(draft.stickerPackId);

  const expired = status === "published" && isExpired(expiresAt);
  const remaining = daysRemaining(expiresAt);

  function act(kind: "revoke" | "delete") {
    startTransition(async () => {
      const result =
        kind === "revoke"
          ? await revokeDraftAction(draft.id)
          : await deleteDraftAction(draft.id);
      if (result.ok) {
        setStatus(kind === "revoke" ? "revoked" : "draft");
        setConfirming(null);
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
            <StatusPill status={status} expired={expired} />
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
                  ? `Link expired ${formatExpiry(expiresAt)}`
                  : `${remaining === 1 ? "1 day" : `${remaining} days`} left · expires ${formatExpiry(expiresAt)}`}
            </p>
          ) : (
            <p className="mt-0.5 text-[0.68rem] text-[#b3a5c2]">
              {mounted ? (
                <>updated {new Date(draft.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</>
              ) : (
                "updated"
              )}
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

        {expired ? (
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
          Delete
        </button>
      </div>

      {renewed ? (
        <p className="mt-2 rounded-xl bg-[#f0f8f2] px-3 py-2 text-[0.72rem] text-[#3f7a4a]">
          Link renewed — live until {formatExpiry(expiresAt)}.
        </p>
      ) : null}

      {confirming ? (
        <div className="mt-3 rounded-2xl bg-[#faf6ff] p-3">
          <p className="text-[0.76rem] text-[#5b4a6d]">
            {confirming === "revoke"
              ? "Revoking stops the link from opening for anyone. You can publish again later."
              : "Deleting removes this letter and its data permanently. This cannot be undone."}
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

function StatusPill({ status, expired }: { status: ApologyDraft["status"]; expired: boolean }) {
  const map = {
    draft: { label: "Draft", className: "bg-[#f4eefb] text-[#7c6892]" },
    published: expired
      ? { label: "Expired", className: "bg-[#fdf1f3] text-[#a8556b]" }
      : { label: "Live", className: "bg-[#e8f5ec] text-[#3f7a4a]" },
    revoked: { label: "Revoked", className: "bg-[#fdf1f3] text-[#a8556b]" },
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
