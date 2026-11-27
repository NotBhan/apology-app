"use client";

import type { ApologyDraft, PhotoAsset } from "@/types/apology";
import { publishDraftAction, saveDraftAction } from "@/app/create/actions";
import { toOptimizedUploadFile, uploadFile } from "@/lib/upload";
import { Wizard, type WizardGateway } from "./Wizard";

const gateway: WizardGateway = {
  async save(id, payload) {
    const result = await saveDraftAction(id, payload);
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? "Could not save this draft.");
    }
    return result.data;
  },

  async publish(id) {
    const result = await publishDraftAction(id);
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? "Could not publish this letter.");
    }
    return result.data;
  },

  async uploadAudio(draftId, file) {
    const asset = await uploadFile(file, "audio", file.name || "audio", draftId);
    return { assetId: asset.id };
  },

  async uploadPhoto(draftId, blob, meta): Promise<PhotoAsset> {
    const file = toOptimizedUploadFile(blob, `photo-${Date.now()}`, meta.type);
    const asset = await uploadFile(file, "photo", file.name, draftId);
    return {
      id: asset.id,
      url: asset.url,
      width: meta.width,
      height: meta.height,
      focalPoint: "50% 50%",
    };
  },

  async deleteAsset(_draftId, assetId) {
    const res = await fetch(`/api/uploads/${encodeURIComponent(assetId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Could not delete that file.");
    }
  },
};

export function CreatorWizardClient({
  draft,
  initialStep,
}: {
  draft: ApologyDraft;
  initialStep?: number;
}) {
  return <Wizard initialDraft={draft} initialStep={initialStep} gateway={gateway} />;
}
