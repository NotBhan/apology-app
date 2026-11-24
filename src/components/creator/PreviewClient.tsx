"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ApologyDraft } from "@/types/apology";
import type { ApologyTheme } from "@/types/theme";
import {
  PresentationEngine,
  type PresentationApi,
} from "@/components/presentation/PresentationEngine";
import { ShareQrDialog } from "@/components/share/ShareQrDialog";
import { publishDraftAction } from "@/app/create/actions";
import { Icon } from "@/components/ui/icons";

interface PreviewClientProps {
  draft: ApologyDraft;
  theme: ApologyTheme;
}

export function PreviewClient({ draft, theme }: PreviewClientProps) {
  const [api, setApi] = useState<PresentationApi | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);

  async function handlePublishAndShare() {
    setPublishError(null);
    setPublishing(true);
    try {
      const result = await publishDraftAction(draft.id, draft.linkDurationDays);
      if (result.ok && result.data) {
        setSharePath(result.data.path);
      } else {
        setPublishError(result.error ?? "Could not generate link.");
      }
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="min-h-svh bg-[#efe9f7]">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-4 py-5 lg:flex-row lg:items-start lg:gap-8 lg:py-8">
        {/* Preview viewport — recipient experience never sees this chrome */}
        <div className="flex flex-1 flex-col items-center">
          <div className="relative w-full max-w-[392px]">
            <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[46px] bg-white/60 blur-xl" />
            <div className="overflow-hidden rounded-[36px] border border-white/70 bg-black p-2 shadow-[0_40px_90px_-50px_rgba(60,30,90,0.8)] sm:rounded-[42px]">
              <div className="relative overflow-hidden rounded-[28px] sm:rounded-[34px]">
                <div className="pointer-events-none absolute left-1/2 top-1.5 z-40 h-5 w-24 -translate-x-1/2 rounded-full bg-black/70" />
                <div className="h-[74svh] max-h-[760px] min-h-[560px] w-full sm:h-[78svh]">
                  <PresentationEngine
                    content={draft}
                    theme={theme}
                    mode="preview"
                    onApiReady={setApi}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[0.68rem] text-[#8a7a9c]">
            Preview frame · the real link fills the recipient&rsquo;s screen
          </p>
        </div>

        {/* Creator controls live outside the presentation viewport */}
        <aside className="w-full shrink-0 space-y-4 rounded-3xl border border-white bg-white/80 p-5 lg:w-[300px]">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[#a394b4]">previewing</p>
            <h1
              className="mt-1 text-[1.35rem] leading-tight text-[#33203f]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {draft.recipientName || "Untitled"}
            </h1>
            <p className="text-[0.78rem] text-[#8a7a9c]">
              {theme.name} · {api ? `scene ${api.index + 1} of ${api.total}` : "loading"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ControlButton onClick={() => api?.back()} disabled={!api?.canBack}>
              ← Back
            </ControlButton>
            <ControlButton onClick={() => api?.next()} disabled={!api || api.index >= api.total - 1}>
              Next →
            </ControlButton>
            <ControlButton onClick={() => api?.restart()} className="col-span-2">
              ↺ Replay from the start
            </ControlButton>
          </div>

          <div className="space-y-1.5">
            <p className="text-[0.62rem] uppercase tracking-[0.16em] text-[#a394b4]">jump to scene</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: api?.total ?? 0 }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => api?.goTo(index)}
                  aria-label={`Go to scene ${index + 1}`}
                  aria-current={api?.index === index}
                  className={`h-7 w-7 rounded-full text-[0.68rem] font-semibold transition ${
                    api?.index === index
                      ? "bg-[#6d3fa8] text-white"
                      : "bg-[#f2ecfa] text-[#7c6892] hover:bg-[#e9e0f6]"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[0.62rem] uppercase tracking-[0.16em] text-[#a394b4]">music</p>
            <p className="text-[0.75rem] text-[#6b5580]">
              {draft.customization.audio.source === "none"
                ? "Off"
                : draft.customization.audio.source === "custom"
                  ? "Your uploaded track"
                  : "Theme soundtrack"}{" "}
              · use the control inside the frame
            </p>
          </div>

          <div className="space-y-2.5 border-t border-[#f0e8f8] pt-4">
            <button
              type="button"
              onClick={handlePublishAndShare}
              disabled={publishing}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#6d3fa8] px-4 text-[0.85rem] font-semibold text-white shadow-sm transition hover:bg-[#5b3290] disabled:opacity-50 cursor-pointer motion-safe:active:scale-95"
            >
              <Icon name="share" size={14} />
              <span>{publishing ? "Preparing link…" : "Publish & Share letter"}</span>
            </button>
            <Link
              href={`/create/${draft.id}?step=publish`}
              className="flex min-h-10 w-full items-center justify-center rounded-full border border-[#e3d7ef] bg-white text-[0.8rem] font-semibold text-[#4b2f6b] transition hover:border-[#c9b6dd]"
            >
              Back to editing
            </Link>
            {publishError && (
              <div className="rounded-xl bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                <p>{publishError}</p>
                <Link
                  href={`/create/${draft.id}`}
                  className="mt-1 inline-block font-semibold underline hover:text-red-900"
                >
                  Edit required fields →
                </Link>
              </div>
            )}
            <p className="text-[0.68rem] leading-relaxed text-[#8a7a9c]">
              Publishing generates a private, secure link and QR code to send to your recipient.
            </p>
          </div>

          {api ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[0.62rem] text-[#a394b4]"
            >
              Keyboard: ← → to move between scenes.
            </motion.p>
          ) : null}
        </aside>
      </div>

      {sharePath ? (
        <ShareQrDialog
          path={sharePath}
          experienceType={draft.experienceType ?? "apology"}
          onClose={() => setSharePath(null)}
        />
      ) : null}
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-9 rounded-full bg-[#f2ecfa] px-3 text-[0.75rem] font-semibold text-[#5b3f7d] transition active:scale-95 disabled:opacity-40 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
