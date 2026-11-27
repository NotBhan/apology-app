"use client";

import { useState } from "react";
import { ShareQrDialog } from "@/components/share/ShareQrDialog";
import { motion } from "framer-motion";
import type { ApologyDraft } from "@/types/apology";
import { getTheme } from "@/themes/registry";
import { getStickerPack } from "@/sticker-packs/registry";
import { resolveSituationLabel } from "@/content/situations";
import { Button } from "@/components/ui/Button";

interface PublishStepProps {
  draft: ApologyDraft;
  publishedToken?: string;
  publishing: boolean;
  error?: string | null;
  onPublish: () => void;
  onPreview: () => void;
  onBack: () => void;
  isResponse?: boolean;
}

export function PublishStep({
  draft,
  publishedToken,
  publishing,
  error,
  onPublish,
  onPreview,
  onBack,
  isResponse = false,
}: PublishStepProps) {
  const [copied, setCopied] = useState(false);
  const theme = getTheme(draft.themeId);
  const pack = getStickerPack(draft.stickerPackId);

  const [showQr, setShowQr] = useState(false);

  const shareUrl =
    publishedToken && typeof window !== "undefined"
      ? `${window.location.origin}/letter/${publishedToken}`
      : "";

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
            ? "This link is private. Only someone with it can open the letter, and it stays live until you revoke or delete it."
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
        {draft.customization.interaction?.envelopeStyle &&
        draft.customization.interaction.envelopeStyle !== "wax-seal" ? (
          <Row
            label="Note style"
            value={
              draft.customization.interaction.envelopeStyle === "ribbon"
                ? "Silk ribbon"
                : "Open stationery"
            }
          />
        ) : null}
        {draft.customization.visual?.fontPairing &&
        draft.customization.visual.fontPairing !== "theme" ? (
          <Row label="Typography" value={draft.customization.visual.fontPairing} />
        ) : null}
      </dl>

      {!publishedToken ? (
        <section className="space-y-1.5 rounded-2xl border border-[#ece2f6] bg-white p-4">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]">
            {isResponse ? "Permanent response link" : "Permanent link"}
          </p>
          <p className="text-[0.74rem] leading-relaxed text-[#8a7a9c]">
            Your {isResponse ? "response" : "link"} stays live until you explicitly revoke or
            delete it. It never expires on its own, and you can remove it from Manage at any time.
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
              permanent
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
            <Button variant="secondary" onClick={() => setShowQr(true)} className="flex-1">
              Share QR
            </Button>
          </div>

          {showQr ? (
            <ShareQrDialog
              path={`/letter/${publishedToken}`}
              experienceType="apology"
              onClose={() => setShowQr(false)}
            />
          ) : null}
          <p className="text-[0.68rem] leading-relaxed text-[#8a7a9c]">
            Stays live until you revoke or delete it. Revoking from Manage stops the link
            immediately; the letter and its files stay until you delete them.
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
              {publishing ? "Publishing…" : isResponse ? "Publish Response" : "Publish & get link"}
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
