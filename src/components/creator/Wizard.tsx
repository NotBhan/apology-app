"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import { normalizeDurationDays } from "@/lib/expiry";
import { NamesStep } from "./steps/NamesStep";
import { SituationStep } from "./steps/SituationStep";
import { MessagesStep } from "./steps/MessagesStep";
import { ThemeStep } from "./steps/ThemeStep";
import { PackStep } from "./steps/PackStep";
import { CustomizeStep } from "./steps/CustomizeStep";
import { PublishStep } from "./steps/PublishStep";

export interface WizardGateway {
  save: (id: string, payload: unknown) => Promise<ApologyDraft>;
  publish: (
    id: string,
    durationDays: number,
  ) => Promise<{ token: string; path: string; expiresAt: string; durationDays: number }>;
  uploadAudio: (draftId: string, file: File) => Promise<{ assetId: string }>;
  uploadPhoto: (
    draftId: string,
    blob: Blob,
    meta: { width: number; height: number; type: string },
  ) => Promise<PhotoAsset>;
}

interface WizardProps {
  initialDraft: ApologyDraft;
  gateway: WizardGateway;
  /**
   * Fires whenever the draft changes. Used by the anonymous editor to keep a
   * local copy in this tab, since it cannot save through the gateway first.
   */
  onDraftChange?: (draft: ApologyDraft) => void;
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

export function Wizard({ initialDraft, gateway, onDraftChange }: WizardProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<ApologyDraft>(() => ({
    ...initialDraft,
    linkDurationDays: normalizeDurationDays(initialDraft.linkDurationDays),
  }));
  const [step, setStep] = useState(initialDraft.messages.message1 ? 1 : 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [token, setToken] = useState<string | undefined>();
  const [publishedExpiresAt, setPublishedExpiresAt] = useState<string | undefined>();

  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = useMemo(() => getTheme(draft.themeId), [draft.themeId]);

  useEffect(() => {
    onDraftChange?.(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

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

  const persist = useCallback(async () => {
    const parsed = draftPayloadSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(formatZodError(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await gateway.save(draft.id, parsed.data);
      setSavedAt(new Date().toISOString());
      dirty.current = false;
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : "Could not save." });
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

  async function publish() {
    setPublishError(null);
    setPublishing(true);
    try {
      await persist();
      const result = await gateway.publish(draft.id, draft.linkDurationDays);
      setToken(result.token);
      setPublishedExpiresAt(result.expiresAt);
      setDraft((current) => ({
        ...current,
        status: "published",
        expiresAt: result.expiresAt,
        linkDurationDays: result.durationDays,
      }));
    } catch (cause) {
      setPublishError(cause instanceof Error ? cause.message : "Could not publish.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[600px] px-4 pb-16 pt-5 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <a
          href="/manage"
          className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#8a7a9c] hover:text-[#5b3f7d]"
        >
          ← All letters
        </a>
        <span className="text-[0.68rem] text-[#a394b4]" aria-live="polite">
          {saving ? "Saving…" : savedAt ? "Saved" : "Draft"}
        </span>
      </div>

      <StepRail step={step} total={STEP_LABELS.length} labels={STEP_LABELS} />

      <div className="mt-7">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
                onChange={(patch) => update(patch)}
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
                onNext={() => setStep(6)}
                onBack={() => setStep(4)}
              />
            ) : null}

            {step === 6 ? (
              <PublishStep
                draft={draft}
                publishedToken={token}
                publishedExpiresAt={publishedExpiresAt}
                publishing={publishing}
                error={publishError}
                onDurationChange={(days) => update({ linkDurationDays: normalizeDurationDays(days) })}
                onPublish={publish}
                onPreview={() => {
                  void persist().then(() => router.push(`/preview/${draft.id}`));
                }}
                onBack={() => setStep(5)}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepRail({
  step,
  total,
  labels,
}: {
  step: number;
  total: number;
  labels: readonly string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: total }).map((_, index) => (
          <motion.span
            key={index}
            className="h-[3px] flex-1 rounded-full"
            initial={false}
            animate={{
              backgroundColor: index <= step ? "#8a5bc4" : "#e9dff5",
              scaleY: index === step ? 1.8 : 1,
            }}
            transition={{ duration: 0.35 }}
          />
        ))}
      </div>
      <p className="text-[0.66rem] uppercase tracking-[0.18em] text-[#a394b4]">
        {String(step + 1).padStart(2, "0")} · {labels[step]}
      </p>
    </div>
  );
}
