"use client";

import { useEffect, useState } from "react";
import { BirthdayLetter } from "@/components/presentation/BirthdayLetter";
import { birthdayContentSchema } from "@/experiences/birthday/schema";
import { ShareQrDialog } from "@/components/share/ShareQrDialog";

const THEMES = [
  { id: "confetti", name: "Confetti" },
  { id: "midnight-gold", name: "Midnight Gold" },
] as const;

const STORAGE_KEY = "koi.birthday.draft";

interface FormValues {
  recipientName: string;
  senderName: string;
  headline: string;
  message: string;
  wish: string;
  themeId: "confetti" | "midnight-gold";
}

const EMPTY: FormValues = {
  recipientName: "",
  senderName: "",
  headline: "",
  message: "",
  wish: "",
  themeId: "confetti",
};

function loadDraft(): FormValues | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FormValues>;
    return { ...EMPTY, ...parsed };
  } catch {
    return null;
  }
}

function saveDraftLocal(values: FormValues) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // A blocked storage API must not break the editor.
  }
}

/**
 * Birthday editor with an anonymous path.
 *
 * Anyone may open it, edit and preview. Nothing is written to the database
 * until a verified session exists: without one, the draft is kept in this
 * tab's sessionStorage and the visitor is sent to sign in, returning here.
 * This is why no anonymous identity has to exist.
 */
export function BirthdayEditor() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [restored, setRestored] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const stored = loadDraft();
    if (stored) {
      setValues(stored);
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    saveDraftLocal(values);
  }, [values]);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const parsed = birthdayContentSchema.safeParse({
    ...values,
    wish: values.wish || undefined,
    photos: [],
    audio: "none",
  });

  async function submit(publish: boolean) {
    setBusy(true);
    setError(null);

    if (!parsed.success) {
      setError("Fill in the names, headline and message first.");
      setBusy(false);
      return;
    }

    // Persist locally before any network hop: a redirect must not lose work.
    saveDraftLocal(values);

    try {
      const created = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ experienceType: "birthday", content: parsed.data }),
      });

      if (created.status === 401) {
        window.location.href = `/auth/sign-in?callbackURL=${encodeURIComponent("/create/birthday")}`;
        return;
      }

      const payload = await created.json();
      if (!created.ok) throw new Error(payload.error ?? "Could not save the draft.");

      if (publish) {
        const id = payload.draft.id as string;
        const res = await fetch(`/api/drafts/${id}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 1 }),
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error ?? "Could not publish.");
        setPublished(out.path as string);
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (preview && parsed.success) {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-stone-200">
          <BirthdayLetter content={parsed.data} />
        </div>
        <button
          type="button"
          onClick={() => setPreview(false)}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
        >
          Back to editing
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {restored ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Draft restored from this browser. Sign in to save it to your account.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Their name</span>
          <input
            value={values.recipientName}
            onChange={(event) => set("recipientName", event.target.value)}
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Your name</span>
          <input
            value={values.senderName}
            onChange={(event) => set("senderName", event.target.value)}
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Headline</span>
        <input
          value={values.headline}
          onChange={(event) => set("headline", event.target.value)}
          required
          maxLength={80}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Message</span>
        <textarea
          value={values.message}
          onChange={(event) => set("message", event.target.value)}
          required
          rows={4}
          maxLength={600}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.15em] text-stone-500">One wish (optional)</span>
        <input
          value={values.wish}
          onChange={(event) => set("wish", event.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Theme</span>
        <select
          value={values.themeId}
          onChange={(event) => set("themeId", event.target.value as FormValues["themeId"])}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
        >
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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          <span>
            Published: <span className="font-mono text-xs">{published}</span>
          </span>
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="rounded-full border border-green-300 px-3 py-1 text-xs font-semibold text-green-900"
          >
            Share QR
          </button>
        </div>
      ) : null}

      {showQr && published ? (
        <ShareQrDialog path={published} experienceType="birthday" onClose={() => setShowQr(false)} />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
        >
          Preview
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit(false)}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save to my account"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit(true)}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-60"
        >
          Publish for 1 day
        </button>
      </div>
    </div>
  );
}
