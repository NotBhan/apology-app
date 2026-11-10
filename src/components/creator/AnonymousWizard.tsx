"use client";

import { useMemo } from "react";
import type { ApologyDraft, PhotoAsset } from "@/types/apology";
import { Wizard, type WizardGateway } from "./Wizard";

const STORAGE_KEY = "koi.apology.draft";

function seed(): ApologyDraft {
  const now = new Date().toISOString();
  return {
    id: "local",
    recipientName: "",
    senderName: "",
    situation: "other",
    situationCustom: "",
    language: "en",
    messages: { message1: "", message2: "", message3: "", personalNote: "" },
    themeId: "romantic",
    stickerPackId: "cats",
    customization: {
      audio: { source: "default", volume: 0.55 },
      photos: [],
      memoryStyle: "polaroid",
    },
    linkDurationDays: 3,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  } as ApologyDraft;
}

function load(): ApologyDraft {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    return { ...seed(), ...(JSON.parse(raw) as Partial<ApologyDraft>) };
  } catch {
    return seed();
  }
}

function persist(draft: ApologyDraft) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage being unavailable must not break the editor.
  }
}

/**
 * Apology wizard without an account.
 *
 * The engine is unchanged: only the gateway is swapped. Saves stay in this
 * tab, uploads say plainly that they need an account, and publishing hands the
 * draft to sign-in. Nothing is written to the database, so no anonymous
 * identity is created.
 */
export function AnonymousWizard() {
  const initial = useMemo(load, []);

  const gateway: WizardGateway = useMemo(
    () => ({
      async save(_id, payload) {
        const merged = {
          ...initial,
          ...(payload as Partial<ApologyDraft>),
          updatedAt: new Date().toISOString(),
        } as ApologyDraft;
        persist(merged);
        return merged;
      },

      async publish() {
        throw new Error("Sign in to publish. Your draft is kept in this browser.");
      },

      async uploadAudio(): Promise<{ assetId: string }> {
        throw new Error("Sign in to add audio.");
      },

      async uploadPhoto(): Promise<PhotoAsset> {
        throw new Error("Sign in to add photos.");
      },
    }),
    [initial],
  );

  return <Wizard initialDraft={initial} gateway={gateway} />;
}
