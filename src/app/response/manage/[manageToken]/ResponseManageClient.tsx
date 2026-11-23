"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { manageResponse } from "@/lib/api/client";
import { resolveEmotionBadge } from "@/experiences/emotion";
import type { QuickReplyPayload, ResponseRecord } from "@/types/response";

export interface ResponseManageClientProps {
  initialRecord: {
    id: string;
    status: ResponseRecord["status"];
    content: QuickReplyPayload;
    publishedAt?: string | null;
    createdAt: string;
  };
  manageToken: string;
}

export function ResponseManageClient({ initialRecord, manageToken }: ResponseManageClientProps) {
  const [status, setStatus] = useState(initialRecord.status);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [isPending, startTransition] = useTransition();

  // URL scrubbing on mount: remove manageToken from the browser address bar
  // to avoid referrer leaks or sharing the management capability accidentally.
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Store manage capability in localStorage before scrubbing
      try {
        const key = "koi_reply_capabilities";
        const raw = localStorage.getItem(key);
        const map = raw ? JSON.parse(raw) : {};
        map[initialRecord.id] = {
          responseId: initialRecord.id,
          manageToken,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(map));
      } catch {
        // Safe to ignore in private browsing
      }

      window.history.replaceState(null, "", "/response/manage");
    }
  }, [initialRecord.id, manageToken]);

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await manageResponse(manageToken, "revoke");
        if (res.ok) setStatus("revoked");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not revoke reply.");
      }
    });
  }

  function handleRestore() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await manageResponse(manageToken, "restore");
        if (res.ok) setStatus("published");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not restore reply.");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await manageResponse(manageToken, "delete");
        if (res.ok) {
          setDeleted(true);
          try {
            const key = "koi_reply_capabilities";
            const raw = localStorage.getItem(key);
            if (raw) {
              const map = JSON.parse(raw);
              delete map[initialRecord.id];
              localStorage.setItem(key, JSON.stringify(map));
            }
          } catch {
            // Ignore
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete reply.");
      }
    });
  }

  const content = initialRecord.content;

  if (deleted) {
    return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center bg-[#faf6ff] px-4 py-16">
        <div className="w-full max-w-[460px] rounded-3xl border border-[#ece2f6] bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fce8e8] text-[#c53030]">
            <Icon name="trash" size={22} />
          </div>
          <h1 className="mt-4 text-[1.2rem] font-semibold text-[#33203f]">
            Reply Permanently Deleted
          </h1>
          <p className="mt-2 text-sm text-[#8a7a9c] leading-relaxed">
            Your reply and all associated media have been queued for physical deletion. The link is no longer accessible.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#6d3fa8] px-5 py-2.5 text-xs font-semibold text-white transition active:scale-95"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-[#faf6ff] px-4 py-12 sm:py-16">
      <div className="w-full max-w-[500px]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#a394b4] hover:text-[#7a4fb0]"
            >
              ← Koi Koi
            </Link>
            <h1 className="mt-1 text-[1.4rem] font-semibold text-[#33203f]">
              Manage Your Reply
            </h1>
          </div>

          {/* Status Badge */}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === "published"
                ? "bg-[#e8f5e9] text-[#2e7d32]"
                : "bg-[#fef3c7] text-[#92400e]"
            }`}
          >
            {status === "published" ? "Live" : "Revoked"}
          </span>
        </div>

        {/* Content Preview Card */}
        <div className="rounded-3xl border border-[#ece2f6] bg-white p-6 shadow-md">
          {(() => {
            const emotionBadge = resolveEmotionBadge(undefined, content.recipientEmotion);
            return emotionBadge ? (
              <div className="mb-3">
                <span className="rounded-full bg-[#f2eafc] px-3 py-0.5 text-xs font-medium text-[#6d3fa8]">
                  {emotionBadge.prefix ? `${emotionBadge.prefix}: ` : ""}{emotionBadge.label}
                </span>
              </div>
            ) : null;
          })()}

          <p className="whitespace-pre-line text-sm text-[#33203f] leading-relaxed">
            {content.message}
          </p>

          {content.photos && content.photos.length > 0 ? (
            <p className="mt-4 text-[0.72rem] text-[#8a7a9c]">
              Attached photos: {content.photos.length}
            </p>
          ) : null}
        </div>

        {/* Public Link Card (if active) */}
        {status === "published" ? (
          <div className="mt-4 rounded-2xl border border-[#eddcf5] bg-white p-4 shadow-sm">
            <label className="text-[0.74rem] font-semibold text-[#4e3661]">
              Public Link
            </label>
            <p className="text-[0.68rem] text-[#8a7a9c]">
              Anyone with this link can read your reply.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== "undefined" ? window.location.href.replace("/manage", "") : ""}
                className="flex-1 rounded-xl border border-[#e5d9f2] bg-[#fbf9fe] px-3 py-2 text-xs text-[#33203f] focus:outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href.replace("/manage", ""));
                    setCopiedPublic(true);
                    setTimeout(() => setCopiedPublic(false), 2000);
                  } catch {
                    setCopiedPublic(false);
                  }
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#6d3fa8] px-3.5 py-2 text-xs font-semibold text-white transition active:scale-95"
              >
                <Icon name={copiedPublic ? "check" : "copy"} size={14} />
                {copiedPublic ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#fed7aa] bg-[#fffbf5] p-4 text-xs text-[#9a3412]">
            <p className="font-semibold">Public link is disabled</p>
            <p className="mt-0.5 text-[0.72rem]">
              The recipient will see a 404 page if they try to open it. You can restore access anytime.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-6 space-y-3">
          {error ? (
            <p className="rounded-xl bg-[#fdf0f0] p-3 text-xs text-[#b03030]">
              {error}
            </p>
          ) : null}

          {status === "published" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleRevoke}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#eddcf5] bg-white py-3 text-xs font-semibold text-[#6d3fa8] shadow-sm transition hover:bg-[#faf5ff] active:scale-[0.99] disabled:opacity-50"
            >
              <Icon name="link-off" size={15} />
              {isPending ? "Updating…" : "Revoke Public Link"}
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={handleRestore}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6d3fa8] py-3 text-xs font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
            >
              <Icon name="refresh" size={15} />
              {isPending ? "Updating…" : "Restore Public Link"}
            </button>
          )}

          {confirmingDelete ? (
            <div className="rounded-2xl border border-[#fca5a5] bg-[#fff5f5] p-4 text-center">
              <p className="text-xs font-semibold text-[#991b1b]">
                Permanently delete this reply?
              </p>
              <p className="mt-1 text-[0.7rem] text-[#b91c1c] leading-relaxed">
                This cannot be undone. All photos and messages will be removed permanently.
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDelete}
                  className="rounded-xl bg-[#dc2626] px-4 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
                >
                  {isPending ? "Deleting…" : "Yes, Delete Permanently"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 text-xs font-medium text-[#4b5563] transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#fee2e2] py-3 text-xs font-semibold text-[#dc2626] transition hover:bg-[#fef2f2] active:scale-[0.99]"
            >
              <Icon name="trash" size={15} />
              Delete Reply Permanently
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
