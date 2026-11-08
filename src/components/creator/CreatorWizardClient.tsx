"use client";

import type { ApologyDraft, PhotoAsset } from "@/types/apology";
import { publishDraftAction, saveDraftAction } from "@/app/create/actions";
import { uploadFile } from "@/lib/upload";
import { Wizard, type WizardGateway } from "./Wizard";

const gateway: WizardGateway = {
  async save(id, payload) {
    const result = await saveDraftAction(id, payload);
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? "Could not save this draft.");
    }
    return result.data;
  },

  async publish(id, durationDays) {
    const result = await publishDraftAction(id, durationDays);
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? "Could not publish this letter.");
    }
    return result.data;
  },

  async uploadAudio(file) {
    const asset = await uploadFile(file, "audio", file.name || "audio");
    return { assetId: asset.id };
  },

  async uploadPhoto(blob, meta): Promise<PhotoAsset> {
    const extension = meta.type === "image/png" ? "png" : "jpg";
    const asset = await uploadFile(blob, "photo", `photo-${Date.now()}.${extension}`);
    return {
      id: asset.id,
      url: asset.url,
      width: meta.width,
      height: meta.height,
      focalPoint: "50% 50%",
    };
  },
};

export function CreatorWizardClient({ draft }: { draft: ApologyDraft }) {
  return <Wizard initialDraft={draft} gateway={gateway} />;
}
