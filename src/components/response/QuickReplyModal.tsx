"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { sendQuickReply, uploadResponsePhoto, type QuickReplyResult } from "@/lib/api/client";
import { getExperience } from "@/experiences/registry";
import type { ExperienceId } from "@/experiences/types";

export interface QuickReplyModalProps {
  apologyId: string;
  senderName: string;
  isOpen: boolean;
  onClose: () => void;
  experienceId?: ExperienceId | string;
}

interface AttachedPhoto {
  id: string;
  previewUrl: string;
}

export function QuickReplyModal({
  apologyId,
  senderName,
  isOpen,
  onClose,
  experienceId,
}: QuickReplyModalProps) {
  const [message, setMessage] = useState("");
  const [emotion, setEmotion] = useState<string | null>(null);
  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickReplyResult | null>(null);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedManage, setCopiedManage] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Resolution semantics:
  // - Omitted experienceId -> default to "apology" for backward compatibility.
  // - Explicit ID -> resolve exact experience.
  // - Unknown ID or experience without replyConfig or replyConfig.enabled === false -> no composer.
  // - Never silently substitute Apology configuration for another experience.
  const targetId = experienceId === undefined ? "apology" : experienceId;
  const experience = getExperience(targetId);
  const config = experience?.replyConfig;

  // Keyboard trap, return focus, and Escape key handling
  useEffect(() => {
    if (!isOpen || config?.enabled !== true) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;

    // Focus first interactive control within modal on open
    if (dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0]?.focus();
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Prevent accidental closing during upload or submission
        if (!uploading && !isPending) {
          onClose();
        }
      } else if (event.key === "Tab") {
        if (!dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            last?.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first?.focus();
            event.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose, config, uploading, isPending]);

  if (!isOpen || config?.enabled !== true) return null;

  async function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (photos.length >= 10) {
      setError("You can attach up to 10 photos.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError("Photos must be 4 MB or smaller.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const res = await uploadResponsePhoto(apologyId, file, responseId ?? undefined);
      if (res.responseId && !responseId) {
        setResponseId(res.responseId);
      }

      const previewUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { id: res.asset.id, previewUrl }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto(idToRemove: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== idToRemove));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) {
      setError("Please write a message before sending.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const replyResult = await sendQuickReply(apologyId, {
          message: message.trim(),
          recipientEmotion: emotion ?? undefined,
          photos: photos.map((p) => p.id),
          responseId: responseId ?? undefined,
        });

        // Store capability locally so the author can manage their response later
        try {
          const key = "koi_reply_capabilities";
          const raw = localStorage.getItem(key);
          const map = raw ? JSON.parse(raw) : {};
          const entryKey = responseId ?? replyResult.manageToken;
          map[entryKey] = {
            responseId: responseId ?? undefined,
            publicToken: replyResult.publicToken,
            manageToken: replyResult.manageToken,
            publicUrl: replyResult.publicUrl,
            manageUrl: replyResult.manageUrl,
            apologyId,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem(key, JSON.stringify(map));
        } catch {
          // Local storage write may fail in private mode; non-blocking
        }

        setResult(replyResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send reply. Try again.");
      }
    });
  }

  async function copyPublicLink() {
    if (!result) return;
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await navigator.clipboard.writeText(`${origin}${result.publicUrl}`);
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    } catch {
      setCopiedPublic(false);
    }
  }

  async function copyManageLink() {
    if (!result) return;
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await navigator.clipboard.writeText(`${origin}${result.manageUrl}`);
      setCopiedManage(true);
      setTimeout(() => setCopiedManage(false), 2000);
    } catch {
      setCopiedManage(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-reply-title"
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading && !isPending) onClose();
      }}
    >
      <div className="flex max-h-[85dvh] sm:max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0e8f7] px-4 py-3.5 sm:px-5 sm:py-4">
          <div>
            <h2 id="quick-reply-title" className="text-[1.05rem] font-semibold text-[#33203f]">
              {result ? "Reply Sent" : config.modalTitle(senderName)}
            </h2>
            <p className="text-[0.72rem] text-[#8a7a9c]">
              {result ? "Your words have been shared" : config.modalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading || isPending}
            className="rounded-full p-2 text-[#8a7a9c] hover:bg-[#f6f0fb] hover:text-[#33203f] disabled:opacity-40"
            aria-label="Close reply modal"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">
          {result ? (
            /* Success State */
            <div className="space-y-5">
              <div className="rounded-2xl bg-[#faf6ff] border border-[#e8dcf5] p-4 text-center">
                <div
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${config.accent} 15%, white)`,
                    color: config.accent,
                  }}
                >
                  <Icon name="check" size={20} />
                </div>
                <h3 className="mt-2 text-sm font-semibold text-[#33203f]">
                  Your reply is ready to share
                </h3>
                <p className="mt-1 text-[0.74rem] text-[#8a7a9c]">
                  Send the public link directly to {senderName}, or view it anytime.
                </p>
              </div>

              {/* Public Link Card */}
              <div className="space-y-1.5">
                <label htmlFor="modal-public-link" className="text-[0.74rem] font-semibold text-[#4e3661]">
                  Public Response Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="modal-public-link"
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}${result.publicUrl}` : result.publicUrl}
                    className="min-w-0 flex-1 rounded-xl border border-[#e5d9f2] bg-[#fbf9fe] px-3 py-2 text-[0.75rem] text-[#33203f] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={copyPublicLink}
                    aria-label="Copy public response link"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[0.75rem] font-semibold text-white transition motion-safe:active:scale-95"
                    style={{ backgroundColor: config.accent }}
                  >
                    <Icon name={copiedPublic ? "check" : "copy"} size={14} />
                    {copiedPublic ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Private Manage Link Card */}
              <div className="space-y-1.5 rounded-2xl border border-[#eddcf0] bg-[#fffbfd] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.74rem] font-semibold text-[#7a3b69]">
                    Private Management Link
                  </span>
                  <span className="rounded-full bg-[#fdebf3] px-2 py-0.5 text-[0.62rem] font-medium text-[#a8556b]">
                    Save this
                  </span>
                </div>
                <p className="text-[0.68rem] leading-relaxed text-[#966b88]">
                  Keep this link if you ever want to hide or permanently delete your reply. We saved a copy to this browser.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="modal-manage-link"
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}${result.manageUrl}` : result.manageUrl}
                    className="min-w-0 flex-1 rounded-xl border border-[#ecdbe4] bg-white px-3 py-2 text-[0.72rem] text-[#33203f] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={copyManageLink}
                    aria-label="Copy private management link"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#7a3b69] px-3.5 py-2 text-[0.72rem] font-semibold text-[#7a3b69] transition hover:bg-[#faeef5] motion-safe:active:scale-95"
                  >
                    <Icon name={copiedManage ? "check" : "copy"} size={14} />
                    {copiedManage ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Link
                  href={result.publicUrl}
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold underline underline-offset-4"
                  style={{ color: config.accent }}
                >
                  View your reply
                  <Icon name="arrow-right" size={14} />
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-5 py-2 text-[0.75rem] font-semibold text-white transition motion-safe:active:scale-95"
                  style={{ backgroundColor: config.accent }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Composer Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Emotion Selector */}
              <div>
                <label className="block text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[#8a7a9c]">
                  {config.emotionBadgePrefix === "Vibe"
                    ? "What's the vibe? (Optional)"
                    : "How are you feeling? (Optional)"}
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {config.emotions.map((item) => {
                    const active = emotion === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setEmotion(active ? null : item.key)}
                        title={item.description}
                        className={`rounded-full border px-3 py-1 text-[0.72rem] transition ${
                          active
                            ? "font-semibold shadow-xs"
                            : "border-[#e5daf0] text-[#554066] hover:border-[#cfbee0]"
                        }`}
                        style={
                          active
                            ? {
                                borderColor: config.accent,
                                backgroundColor: `color-mix(in oklab, ${config.accent} 12%, white)`,
                                color: config.accent,
                              }
                            : undefined
                        }
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Presets */}
              {config.presets && config.presets.length > 0 ? (
                <div>
                  <label className="block text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[#8a7a9c]">
                    Quick Presets
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {config.presets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMessage(preset)}
                        className="rounded-xl border border-[#ece1f5] bg-[#faf7fd] px-2.5 py-1 text-left text-[0.72rem] text-[#5c476f] transition hover:border-[#d7c3e6] hover:bg-[#f4edf9] motion-safe:active:scale-[0.98]"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Message Input */}
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="reply-message" className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[#8a7a9c]">
                    Your message
                  </label>
                  <span
                    aria-live="polite"
                    className={`text-[0.68rem] ${message.length > 2000 ? "text-red-500 font-semibold" : "text-[#b0a2be]"}`}
                  >
                    {message.length} / 2000
                  </span>
                </div>
                <textarea
                  id="reply-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  placeholder={config.messagePlaceholder}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "reply-error" : undefined}
                  className="mt-1.5 w-full resize-none rounded-2xl border border-[#e5daf0] p-3 text-[0.85rem] text-[#33203f] placeholder:text-[#b8a9c8] focus:border-[#6d3fa8] focus:outline-none"
                />
              </div>

              {/* Photo Attachments */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[#8a7a9c]">
                    Attach Photos ({photos.length}/10)
                  </span>
                  {uploading ? (
                    <span role="status" aria-live="polite" className="text-[0.68rem] font-medium" style={{ color: config.accent }}>
                      Uploading photo…
                    </span>
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((photo, pIdx) => (
                    <div
                      key={photo.id}
                      className="group relative h-16 w-16 overflow-hidden rounded-xl border border-[#e0d4ec]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.previewUrl} alt={`Attached moment ${pIdx + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-80 transition hover:opacity-100"
                        aria-label={`Remove photo ${pIdx + 1}`}
                      >
                        <Icon name="x" size={10} />
                      </button>
                    </div>
                  ))}

                  {photos.length < 10 ? (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-16 w-16 flex-col items-center justify-center rounded-xl border border-dashed border-[#d1bfdf] text-[#8a7a9c] transition hover:border-[#6d3fa8] hover:text-[#6d3fa8] disabled:opacity-50"
                      aria-label="Add photo"
                    >
                      <Icon name="image" size={18} />
                      <span className="mt-0.5 text-[0.62rem] font-medium">Add</span>
                    </button>
                  ) : null}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoSelected}
                  />
                </div>
              </div>

              {error ? (
                <p id="reply-error" role="alert" className="rounded-xl bg-[#fdf0f0] p-2.5 text-[0.72rem] text-[#b03030]">
                  {error}
                </p>
              ) : null}

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending || uploading || !message.trim()}
                  aria-busy={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[0.82rem] font-semibold text-white transition motion-safe:active:scale-[0.99] disabled:opacity-50"
                  style={{ backgroundColor: config.accent }}
                >
                  <Icon name="send" size={15} />
                  {isPending ? "Sending reply…" : "Send Quick Reply"}
                </button>
                <p className="mt-2 text-center text-[0.66rem] text-[#9f91af]">
                  No account required. You will receive a private link to manage or delete this reply.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
