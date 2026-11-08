"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ApologyDraft } from "@/types/apology";
import { getTheme } from "@/themes/registry";
import { getStickerPack } from "@/sticker-packs/registry";
import { resolveSituationLabel } from "@/content/situations";
import {
  MAX_LINK_DAYS,
  MIN_LINK_DAYS,
  computeExpiresAt,
  formatDuration,
  formatExpiry,
} from "@/lib/expiry";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface PublishStepProps {
  draft: ApologyDraft;
  publishedToken?: string;
  publishedExpiresAt?: string;
  publishing: boolean;
  error?: string | null;
  onDurationChange: (days: number) => void;
  onPublish: () => void;
  onPreview: () => void;
  onBack: () => void;
}

const DAY_OPTIONS = Array.from(
  { length: MAX_LINK_DAYS - MIN_LINK_DAYS + 1 },
  (_, index) => MIN_LINK_DAYS + index,
);

export function PublishStep({
  draft,
  publishedToken,
  publishedExpiresAt,
  publishing,
  error,
  onDurationChange,
  onPublish,
  onPreview,
  onBack,
}: PublishStepProps) {
  const [copied, setCopied] = useState(false);
  const theme = getTheme(draft.themeId);
  const pack = getStickerPack(draft.stickerPackId);
  const duration = draft.linkDurationDays;

  const shareUrl =
    publishedToken && typeof window !== "undefined"
      ? `${window.location.origin}/letter/${publishedToken}`
      : "";

  // Shown before publishing so the sender sees the exact deadline up front.
  const projectedExpiry = computeExpiresAt(duration);

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#a394b4]">step seven</p>
        <h1
          className="text-[clamp(1.6rem,6vw,2rem)] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {publishedToken ? "It's ready to send" : "One last look"}
        </h1>
        <p className="text-[0.86rem] leading-relaxed text-[#7c6892]">
          {publishedToken
            ? "This link is private and temporary. Only someone with it can open the letter, and only until it expires."
            : "Walk through the whole experience first. You can change anything afterwards."}
        </p>
      </header>

      <dl className="divide-y divide-[#f0e8f8] overflow-hidden rounded-2xl border border-[#ece2f6] bg-white text-[0.8rem]">
        <Row label="For" value={draft.recipientName} />
        <Row label="From" value={draft.senderName} />
        <Row label="About" value={resolveSituationLabel(draft.situation, draft.situationCustom)} />
        <Row label="Theme" value={theme.name} />
        <Row label="Characters" value={pack.name} />
        <Row label="Photos" value={String(draft.customization.photos.length)} />
        <Row
          label="Music"
          value={
            draft.customization.audio.source === "none"
              ? "Off"
              : draft.customization.audio.source === "custom"
                ? "Your own"
                : "Theme default"
          }
        />
      </dl>

      {!publishedToken ? (
        <section className="space-y-2.5 rounded-2xl border border-[#ece2f6] bg-white p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]">
              Link stays live for
            </p>
            <span className="text-[0.72rem] text-[#8a7a9c]">
              {MIN_LINK_DAYS}–{MAX_LINK_DAYS} days
            </span>
          </div>

          <div role="radiogroup" aria-label="Link lifetime in days" className="flex gap-1.5">
            {DAY_OPTIONS.map((option) => {
              const active = option === duration;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={formatDuration(option)}
                  onClick={() => onDurationChange(option)}
                  className={cn(
                    "h-10 flex-1 rounded-xl border text-[0.8rem] font-semibold transition active:scale-95",
                    active
                      ? "border-[#6d3fa8] bg-[#6d3fa8] text-white"
                      : "border-[#ece2f6] bg-white text-[#6b5580] hover:border-[#d9c8ec]",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <p className="text-[0.74rem] leading-relaxed text-[#8a7a9c]">
            Expires{" "}
            <span className="font-semibold text-[#4b2f6b]">{formatExpiry(projectedExpiry)}</span>.
            After that the link stops opening for anyone — you can publish again for a fresh window.
          </p>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-[#fef2f2] px-3 py-2 text-[0.75rem] text-[#b91c1c]">{error}</p>
      ) : null}

      {publishedToken ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-2xl border border-[#d9c8ec] bg-[#faf6ff] p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]">
              Private link
            </p>
            <span className="rounded-full bg-white px-2 py-0.5 text-[0.62rem] font-semibold text-[#5b3f7d]">
              expires {formatExpiry(publishedExpiresAt ?? projectedExpiry)}
            </span>
          </div>
          <p className="break-all rounded-xl bg-white px-3 py-2 text-[0.78rem] text-[#33203f]">
            {shareUrl}
          </p>
          <div className="flex gap-2">
            <Button onClick={copyLink} className="flex-1">
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open(shareUrl, "_blank", "noopener")}
              className="flex-1"
            >
              Open
            </Button>
          </div>
          <p className="text-[0.68rem] leading-relaxed text-[#8a7a9c]">
            Live for {formatDuration(duration)}. You can revoke it earlier from Manage, and an
            expired link can be renewed by publishing again.
          </p>
        </motion.div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {!publishedToken ? (
          <>
            <Button variant="secondary" size="lg" full onClick={onPreview}>
              Preview the experience
            </Button>
            <Button size="lg" full onClick={onPublish} disabled={publishing}>
              {publishing ? "Publishing…" : `Publish for ${formatDuration(duration)}`}
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="lg" full onClick={onPreview}>
            Preview again
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-[0.75rem] text-[#8a7a9c] underline underline-offset-4"
      >
        Back to customisation
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="text-[0.72rem] uppercase tracking-[0.12em] text-[#a394b4]">{label}</dt>
      <dd className="text-right font-medium text-[#33203f]">{value}</dd>
    </div>
  );
}
