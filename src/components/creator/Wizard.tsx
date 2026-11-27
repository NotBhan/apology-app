"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type {
  ApologyCustomization,
  ApologyDraft,
  ApologyMessages,
  PhotoAsset,
} from "@/types/apology";
import type { StickerPackId } from "@/types/sticker";
import type { ThemeId } from "@/types/theme";
import { getTheme, THEMES } from "@/themes/registry";
import { draftPayloadSchema, formatZodError } from "@/lib/validation/apology";
import { PresentationEngine } from "@/components/presentation/PresentationEngine";
import { NamesStep } from "./steps/NamesStep";
import { SituationStep } from "./steps/SituationStep";
import { MessagesStep } from "./steps/MessagesStep";
import { ThemeStep } from "./steps/ThemeStep";
import { PackStep } from "./steps/PackStep";
import { CustomizeStep } from "./steps/CustomizeStep";
import { PublishStep } from "./steps/PublishStep";

export interface WizardGateway {
  save: (id: string, payload: unknown) => Promise<ApologyDraft>;
  /**
   * Publishes the draft.
   *
   * `path` is the link to hand to the recipient. For a record that is already
   * published the server keeps the existing token, so `token`/`path` may be
   * empty: there is no plaintext link to re-display, and the one already sent
   * continues to work.
   */
  publish: (id: string) => Promise<{ token: string; path: string }>;
  uploadAudio: (draftId: string, file: File) => Promise<{ assetId: string }>;
  uploadPhoto: (
    draftId: string,
    blob: Blob,
    meta: { width: number; height: number; type: string },
  ) => Promise<PhotoAsset>;
  deleteAsset?: (draftId: string, assetId: string) => Promise<void>;
}

interface WizardProps {
  initialDraft: ApologyDraft;
  gateway: WizardGateway;
  /**
   * Fires whenever the draft changes. Used by the anonymous editor to keep a
   * local copy in this tab, since it cannot save through the gateway first.
   */
  onDraftChange?: (draft: ApologyDraft) => void;
  isResponse?: boolean;
  initialStep?: number;
}

/**
 * Nested sections are patched field-by-field, so a step can update one message
 * without replacing the other three.
 */
export type DraftPatch = Partial<Omit<ApologyDraft, "messages" | "customization">> & {
  messages?: Partial<ApologyMessages>;
  customization?: Partial<ApologyCustomization>;
};

const STEP_LABELS = [
  "Names",
  "Situation",
  "Words",
  "Theme",
  "Characters",
  "Customise",
  "Publish",
] as const;

export function Wizard({
  initialDraft,
  gateway,
  onDraftChange,
  isResponse = false,
  initialStep,
}: WizardProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState<ApologyDraft>(initialDraft);
  const [step, setStep] = useState(() => initialStep ?? (initialDraft.messages.message1 ? 1 : 0));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [token, setToken] = useState<string | undefined>();
  const [localPreviewOpen, setLocalPreviewOpen] = useState(false);

  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = useMemo(() => getTheme(draft.themeId), [draft.themeId]);

  useEffect(() => {
    onDraftChange?.(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    if (!localPreviewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setLocalPreviewOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [localPreviewOpen]);

  const update = useCallback((patch: DraftPatch) => {
    setDraft((current) => ({
      ...current,
      ...patch,
      messages: { ...current.messages, ...patch.messages },
      customization: { ...current.customization, ...patch.customization },
      updatedAt: new Date().toISOString(),
    }));
    dirty.current = true;
  }, []);

  const persist = useCallback(async (): Promise<boolean> => {
    const parsed = draftPayloadSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(formatZodError(parsed.error));
      return false;
    }
    setErrors({});
    setSaving(true);
    try {
      await gateway.save(draft.id, parsed.data);
      setSavedAt(new Date().toISOString());
      dirty.current = false;
      return true;
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : "Could not save." });
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, gateway]);

  // Debounced autosave: 900 ms after the last edit.
  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist();
    }, 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, persist]);

  function stepForValidationErrors(fieldErrors: Record<string, string>): number | null {
    if (fieldErrors.recipientName || fieldErrors.senderName) return 0;
    if (fieldErrors.situationCustom || fieldErrors.situation) return 1;
    if (Object.keys(fieldErrors).some((key) => key.startsWith("messages"))) return 2;
    return null;
  }

  async function publish() {
    setPublishError(null);
    const parsed = draftPayloadSchema.safeParse(draft);
    if (!parsed.success) {
      const formatted = formatZodError(parsed.error);
      setErrors(formatted);
      const firstMessage =
        Object.values(formatted)[0] ?? "Please fill in the required fields before publishing.";
      setPublishError(firstMessage);
      const targetStep = stepForValidationErrors(formatted);
      if (targetStep !== null) setStep(targetStep);
      return;
    }
    setPublishing(true);
    try {
      const savedOk = await persist();
      if (!savedOk) {
        setPublishError("Could not save changes before publishing.");
        return;
      }
      const result = await gateway.publish(draft.id);
      setToken(result.token || undefined);
      setDraft((current) => ({ ...current, status: "published" }));
    } catch (cause) {
      setPublishError(cause instanceof Error ? cause.message : "Could not publish.");
    } finally {
      setPublishing(false);
    }
  }

  const inlinePreviewOnly = draft.id === "local" || draft.id === "reply-draft";

  return (
    <div className="mx-auto w-full max-w-[600px] px-4 pb-16 pt-5 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        {isResponse ? (
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#8a7a9c]">
            Private response
          </span>
        ) : (
          <a
            href="/manage"
            className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#8a7a9c] hover:text-[#5b3f7d]"
          >
            ← All letters
          </a>
        )}
        <span className="text-[0.68rem] text-[#a394b4]" aria-live="polite">
          {saving ? "Saving…" : savedAt ? "Saved" : "Draft"}
        </span>
      </div>

      <StepRail
        step={step}
        total={STEP_LABELS.length}
        labels={STEP_LABELS}
        onStepClick={setStep}
      />

      <div className="mt-7">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 ? (
              <NamesStep
                recipientName={draft.recipientName}
                senderName={draft.senderName}
                errors={errors}
                onChange={(patch) => update(patch)}
                onNext={() => setStep(1)}
              />
            ) : null}

            {step === 1 ? (
              <SituationStep
                situation={draft.situation}
                situationCustom={draft.situationCustom ?? ""}
                recipientName={draft.recipientName}
                onChange={(patch) => update(patch)}
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
              />
            ) : null}

            {step === 2 ? (
              <MessagesStep
                messages={draft.messages}
                language={draft.language}
                situation={draft.situation}
                recipientName={draft.recipientName}
                contentCustomization={draft.customization.content}
                hasPhotos={draft.customization.photos.length > 0}
                onChange={(patch) => update(patch)}
                onContentCustomizationChange={(content) =>
                  update({ customization: { content } })
                }
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            ) : null}

            {step === 3 ? (
              <ThemeStep
                themeId={draft.themeId}
                recipientName={draft.recipientName}
                senderName={draft.senderName}
                onChange={(themeId: ThemeId) => {
                  const nextTheme = THEMES[themeId];
                  update({ themeId, stickerPackId: nextTheme.suggestedPack });
                }}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
              />
            ) : null}

            {step === 4 ? (
              <PackStep
                packId={draft.stickerPackId}
                suggestedPackId={theme.suggestedPack}
                onChange={(stickerPackId: StickerPackId) => update({ stickerPackId })}
                onNext={() => setStep(5)}
                onBack={() => setStep(3)}
              />
            ) : null}

            {step === 5 ? (
              <CustomizeStep
                customization={draft.customization}
                theme={theme}
                onChange={(patch) => update({ customization: patch })}
                onUploadAudio={(file) => gateway.uploadAudio(draft.id, file)}
                onUploadPhoto={(blob, meta) => gateway.uploadPhoto(draft.id, blob, meta)}
                onRemoveAsset={
                  draft.status !== "published" && gateway.deleteAsset
                    ? (assetId) => gateway.deleteAsset!(draft.id, assetId)
                    : undefined
                }
                onNext={() => setStep(6)}
                onBack={() => setStep(4)}
              />
            ) : null}

            {step === 6 ? (
              <PublishStep
                draft={draft}
                publishedToken={token}
                publishing={publishing}
                error={publishError}
                onPublish={publish}
                onPreview={() => {
                  if (inlinePreviewOnly) {
                    setLocalPreviewOpen(true);
                    return;
                  }
                  void persist().then(() => router.push(`/preview/${draft.id}`));
                }}
                onBack={() => setStep(5)}
                isResponse={isResponse}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {localPreviewOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Experience preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) setLocalPreviewOpen(false);
          }}
        >
          <div className="relative flex h-[86svh] max-h-[760px] w-full max-w-[400px] flex-col overflow-hidden rounded-[28px] bg-black p-2 shadow-2xl">
            <div className="mb-2 flex items-center justify-between px-3 pt-1 text-white">
              <span className="text-[0.68rem] uppercase tracking-[0.18em] text-white/75">
                Walkthrough preview
              </span>
              <button
                type="button"
                onClick={() => setLocalPreviewOpen(false)}
                className="min-h-8 rounded-full bg-white/15 px-3 py-1 text-[0.72rem] font-semibold text-white hover:bg-white/25"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-[22px]">
              <PresentationEngine
                content={draft}
                theme={theme}
                mode="preview"
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StepRail({
  step,
  total,
  labels,
  onStepClick,
}: {
  step: number;
  total: number;
  labels: readonly string[];
  onStepClick?: (step: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5" aria-label="Wizard steps">
        {Array.from({ length: total }).map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onStepClick?.(index)}
            className="group relative flex h-[18px] flex-1 items-center py-1 focus:outline-none"
            title={`Step ${index + 1}: ${labels[index]}`}
            aria-label={`Jump to step ${index + 1}: ${labels[index]}`}
          >
            <motion.span
              className="h-[3px] w-full rounded-full transition-colors group-hover:bg-[#8a5bc4]/70"
              initial={false}
              animate={{
                backgroundColor: index <= step ? "#8a5bc4" : "#e9dff5",
                scaleY: index === step ? 1.8 : 1,
              }}
              transition={{ duration: 0.35 }}
            />
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between text-[0.66rem] uppercase tracking-[0.18em] text-[#a394b4]">
        <p>
          {String(step + 1).padStart(2, "0")} · {labels[step]}
        </p>
        {step < total - 1 ? (
          <button
            type="button"
            onClick={() => onStepClick?.(total - 1)}
            className="font-medium text-[#8a5bc4] hover:underline"
          >
            Skip to publish →
          </button>
        ) : null}
      </div>
    </div>
  );
}
