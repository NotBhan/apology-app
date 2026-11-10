"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
export function AnonymousWizard({ signedIn = false }: { signedIn?: boolean }) {
  const initial = useMemo(load, []);
  const router = useRouter();
  const [adopting, setAdopting] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);

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
        persist(initial);
        window.location.href = `/auth/sign-in?callbackURL=${encodeURIComponent("/create/start")}`;
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

  async function adopt() {
    setAdopting(true);
    setAdoptError(null);
    try {
      const stored = load();
      const created = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipientName: stored.recipientName,
          senderName: stored.senderName,
        }),
      });
      const payload = await created.json();
      if (!created.ok) throw new Error(payload.error ?? "Could not save the draft.");

      const saved = await fetch(`/api/drafts/${payload.draft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(stored),
      });
      if (!saved.ok) {
        const out = await saved.json().catch(() => null);
        throw new Error(out?.error ?? "Could not save the draft.");
      }

      window.sessionStorage.removeItem(STORAGE_KEY);
      router.push(`/create/${payload.draft.id}`);
    } catch (cause) {
      setAdoptError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setAdopting(false);
    }
  }

  return (
    <div className="space-y-4">
      {signedIn ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#efe7f8] px-3 py-2 text-xs text-[#4b2f6b]">
          <span>You are signed in. Save this draft to your account to keep it.</span>
          <button
            type="button"
            onClick={() => void adopt()}
            disabled={adopting}
            className="rounded-lg bg-[#6d3fa8] px-3 py-1.5 font-semibold text-white disabled:opacity-60"
          >
            {adopting ? "Saving…" : "Save to my account"}
          </button>
        </div>
      ) : null}
      {adoptError ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {adoptError}
        </p>
      ) : null}
      <Wizard initialDraft={initial} gateway={gateway} onDraftChange={persist} />
    </div>
  );
}
