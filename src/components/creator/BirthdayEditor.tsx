"use client";

import { useState } from "react";

const THEMES = [
  { id: "confetti", name: "Confetti" },
  { id: "midnight-gold", name: "Midnight Gold" },
] as const;

interface Draft {
  id: string;
  content: {
    recipientName: string;
    senderName: string;
    headline: string;
    message: string;
    wish?: string;
    themeId: "confetti" | "midnight-gold";
  };
}

/**
 * Birthday editor.
 *
 * Deliberately small: it owns the fields a birthday actually has and posts them
 * to the module endpoint, which validates with the birthday schema. It never
 * sends an apology payload, and it does not invent a second persistence path.
 */
export function BirthdayEditor() {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData, publish: boolean) {
    setBusy(true);
    setError(null);

    const content = {
      recipientName: String(formData.get("recipientName") ?? "").trim(),
      senderName: String(formData.get("senderName") ?? "").trim(),
      headline: String(formData.get("headline") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
      wish: String(formData.get("wish") ?? "").trim() || undefined,
      themeId: String(formData.get("themeId") ?? "confetti"),
      photos: [],
      audio: "none" as const,
    };

    try {
      let id = draftId;
      if (!id) {
        const created = await fetch("/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ experienceType: "birthday", content }),
        });
        const payload = await created.json();
        if (!created.ok) throw new Error(payload.error ?? "Could not create the draft.");
        id = payload.draft.id as string;
        setDraftId(id);
      } else {
        const saved = await fetch(`/api/experiences/birthday/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const payload = await saved.json();
        if (!saved.ok) throw new Error(payload.error ?? "Could not save the draft.");
      }

      if (publish) {
        const res = await fetch(`/api/drafts/${id}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 1 }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? "Could not publish.");
        setPublished(payload.path as string);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void submit(data, false);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Their name</span>
          <input name="recipientName" required className="w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Your name</span>
          <input name="senderName" required className="w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Headline</span>
        <input name="headline" required maxLength={80} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Message</span>
        <textarea name="message" required rows={4} maxLength={600} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.15em] text-stone-500">One wish (optional)</span>
        <input name="wish" maxLength={200} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Theme</span>
        <select name="themeId" className="w-full rounded-lg border border-stone-300 px-3 py-2">
          {THEMES.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {published ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Published: <span className="font-mono text-xs">{published}</span>
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={(event) => {
            const form = event.currentTarget.closest("form");
            if (form) void submit(new FormData(form), true);
          }}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-60"
        >
          Publish for 1 day
        </button>
      </div>
    </form>
  );
}
