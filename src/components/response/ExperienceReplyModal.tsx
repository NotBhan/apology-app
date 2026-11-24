"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icons";
import type { ApologyDraft } from "@/types/apology";
import type { BirthdayContent } from "@/experiences/birthday/schema";
import type { ExperienceId } from "@/experiences/types";
import { Wizard, type WizardGateway } from "@/components/creator/Wizard";
import { BirthdayEditor } from "@/components/creator/BirthdayEditor";
import { ExperienceSelectionModal } from "./ExperienceSelectionModal";
import { ExperienceReplyCompleteDialog } from "./ExperienceReplyCompleteDialog";
import { sendExperienceReply, uploadResponsePhoto } from "@/lib/api/client";

export interface ExperienceReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apologyId: string;
  parentSenderName: string;
  parentRecipientName: string;
}

function storeReplyCapability(publicToken: string, manageToken: string) {
  try {
    const storeKey = "koi_reply_capabilities";
    const currentStore = JSON.parse(localStorage.getItem(storeKey) || "{}");
    currentStore[manageToken] = {
      publicToken,
      manageToken,
      storedAt: new Date().toISOString(),
    };
    localStorage.setItem(storeKey, JSON.stringify(currentStore));
  } catch {
    // Local storage unavailable
  }
}

export function ExperienceReplyModal({
  isOpen,
  onClose,
  apologyId,
  parentSenderName,
  parentRecipientName,
}: ExperienceReplyModalProps) {
  const [step, setStep] = useState<"select" | "editor" | "complete">("select");
  const [selectedExperience, setSelectedExperience] = useState<ExperienceId | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const apologyDraftRef = useRef<ApologyDraft | null>(null);
  const responseIdRef = useRef<string | null>(null);

  const portalNode = typeof document !== "undefined" ? document.body : null;

  const initialApologyDraft = useMemo<ApologyDraft>(() => {
    const now = new Date().toISOString();
    return {
      id: "reply-draft",
      recipientName: parentSenderName,
      senderName: parentRecipientName,
      situation: "other",
      situationCustom: "",
      language: "en",
      messages: { message1: "", message2: "", message3: "", personalNote: "" },
      themeId: "heartfelt",
      stickerPackId: "cats",
      customization: {
        audio: { source: "default", volume: 0.55 },
        photos: [],
        memoryStyle: "polaroid",
      },
      linkDurationDays: 1,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    } as ApologyDraft;
  }, [parentSenderName, parentRecipientName]);

  const apologyGateway: WizardGateway = useMemo(
    () => ({
      async save(_id, payload) {
        return payload as ApologyDraft;
      },
      async publish(_id, durationDays) {
        const payloadToPublish = apologyDraftRef.current ?? initialApologyDraft;
        const result = await sendExperienceReply(apologyId, {
          experienceType: "apology",
          content: payloadToPublish as unknown as Record<string, unknown>,
          responseId: responseIdRef.current ?? undefined,
        });

        storeReplyCapability(result.publicToken, result.manageToken);
        setPublicUrl(result.publicUrl);
        setStep("complete");

        return {
          token: result.publicToken,
          path: result.publicUrl,
          expiresAt: "",
          durationDays,
        };
      },
      async uploadAudio() {
        throw new Error("Audio uploads are not available in response mode.");
      },
      async uploadPhoto(_draftId, blob, meta) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, {
          type: meta.type || "image/jpeg",
        });
        const res = await uploadResponsePhoto(
          apologyId,
          file,
          responseIdRef.current ?? undefined,
          "experience"
        );
        if (res.responseId && !responseIdRef.current) {
          responseIdRef.current = res.responseId;
        }
        return {
          id: res.asset.id,
          url: res.asset.url,
          caption: "",
          focalPoint: "50% 50%",
          width: meta.width,
          height: meta.height,
        };
      },
    }),
    [apologyId, initialApologyDraft]
  );

  async function handlePublishBirthdayResponse(content: BirthdayContent) {
    const result = await sendExperienceReply(apologyId, {
      experienceType: "birthday",
      content: content as unknown as Record<string, unknown>,
    });

    storeReplyCapability(result.publicToken, result.manageToken);
    setPublicUrl(result.publicUrl);
    setStep("complete");

    return { path: result.publicUrl, publicToken: result.publicToken };
  }

  function handleResetAndClose() {
    setStep("select");
    setSelectedExperience(null);
    setPublicUrl(null);
    onClose();
  }

  if (!isOpen) return null;

  if (step === "complete" && publicUrl) {
    return (
      <ExperienceReplyCompleteDialog
        isOpen={true}
        onClose={handleResetAndClose}
        publicUrl={publicUrl}
        senderName={parentSenderName}
        experienceType={selectedExperience === "birthday" ? "Birthday" : "Apology"}
      />
    );
  }

  if (step === "select") {
    return (
      <ExperienceSelectionModal
        isOpen={true}
        onClose={handleResetAndClose}
        onSelect={(expId) => {
          setSelectedExperience(expId);
          setStep("editor");
        }}
        senderName={parentSenderName}
      />
    );
  }

  if (!portalNode) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="experience-editor-title"
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#faf6ff]"
    >
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eeddf5] bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <button
          type="button"
          onClick={() => setStep("select")}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#eeddf5] px-3.5 py-1.5 text-xs font-semibold text-[#6d3fa8] hover:bg-[#faf5fc] transition-colors"
        >
          <Icon name="chevron-left" size={14} />
          <span>Change Type</span>
        </button>

        <div className="text-center min-w-0 px-2">
          <h1 id="experience-editor-title" className="text-xs font-bold uppercase tracking-wider text-[#33203f] truncate">
            {selectedExperience === "birthday" ? "Birthday Response" : "Apology Response"}
          </h1>
          <p className="text-[0.68rem] text-[#7d6892] truncate">
            Replying to <span className="font-semibold text-[#6d3fa8]">{parentSenderName}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetAndClose}
          aria-label="Close editor"
          className="rounded-full p-2 text-[#917d9e] hover:bg-[#f6effa] hover:text-[#33203f] transition-colors"
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Editor Body */}
      <div className="py-6">
        {selectedExperience === "birthday" ? (
          <div className="mx-auto max-w-[620px] px-4">
            <BirthdayEditor
              initialValues={{
                recipientName: parentSenderName,
                senderName: parentRecipientName,
              }}
              isResponse={true}
              onPublishResponse={handlePublishBirthdayResponse}
              onUploadPhoto={async (file: File) => {
                const res = await uploadResponsePhoto(
                  apologyId,
                  file,
                  responseIdRef.current ?? undefined,
                  "experience"
                );
                if (res.responseId && !responseIdRef.current) {
                  responseIdRef.current = res.responseId;
                }
                return { url: res.asset.url };
              }}
              onCancel={() => setStep("select")}
            />
          </div>
        ) : (
          <Wizard
            initialDraft={initialApologyDraft}
            gateway={apologyGateway}
            isResponse={true}
            onDraftChange={(draft) => {
              apologyDraftRef.current = draft;
            }}
          />
        )}
      </div>
    </div>,
    portalNode,
  );
}
