"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { ShareQrDialog } from "@/components/share/ShareQrDialog";

export interface ExperienceReplyCompleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  publicUrl: string;
  senderName: string;
  experienceType: string;
}

export function ExperienceReplyCompleteDialog({
  isOpen,
  onClose,
  publicUrl,
  senderName,
  experienceType,
}: ExperienceReplyCompleteDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${publicUrl}` : publicUrl;

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `A reply for ${senderName}`,
          text: `I created an experience for you on Koi Koi.`,
          url: fullUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reply-complete-title"
        className="w-full max-w-md rounded-3xl border border-[#eeddf5] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
            <Icon name="check" size={24} />
          </div>
          <h2 id="reply-complete-title" className="mt-3 text-lg font-bold text-[#33203f]">
            Your Experience Reply is Published!
          </h2>
          <p className="mt-1 text-xs text-[#715c85] leading-relaxed">
            You created a {experienceType} experience for <span className="font-semibold text-[#33203f]">{senderName}</span>. Send them the link below so they can open and experience it.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-[#eedcf8] bg-[#faf6ff] p-4">
          <label className="text-[0.68rem] font-bold uppercase tracking-wider text-[#7c4ddb]">
            Shareable Response Link
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={fullUrl}
              aria-label="Shareable response link"
              className="w-full min-w-0 rounded-xl border border-[#eedcf8] bg-white px-3 py-2 text-xs font-mono text-[#33203f] select-all focus:outline-none focus:ring-2 focus:ring-[#7c4ddb]"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-xl bg-[#7c4ddb] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#6839c4] transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#eeddf5] bg-white px-4 py-2.5 text-xs font-semibold text-[#6d3fa8] hover:bg-[#faf6ff] transition-colors"
          >
            <Icon name="image" size={15} />
            <span>Show QR Code</span>
          </button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#eeddf5] bg-white px-4 py-2.5 text-xs font-semibold text-[#6d3fa8] hover:bg-[#faf6ff] transition-colors"
            >
              <Icon name="send" size={15} />
              <span>Share Link</span>
            </button>
          ) : null}
        </div>

        <div className="mt-5 border-t border-[#f4edf9] pt-4 text-center">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#33203f] py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#241733] transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {showQr ? (
        <ShareQrDialog
          path={publicUrl}
          experienceType={experienceType}
          onClose={() => setShowQr(false)}
        />
      ) : null}
    </div>
  );
}
