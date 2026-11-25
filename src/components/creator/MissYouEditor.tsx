"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MissYouLetter } from "@/components/presentation/MissYouLetter";
import {
  MISS_YOU_AUDIO_IDS,
  MISS_YOU_PHOTO_LAYOUTS,
  missYouContentSchema,
  type MissYouAudioId,
  type MissYouContent,
  type MissYouPhotoLayout,
  type MissYouThemeId,
} from "@/experiences/miss-you/schema";
import { MISS_YOU_THEMES, resolveMissYouTheme } from "@/experiences/miss-you/themes";
import { MUSIC_TRACKS } from "@/content/tracks";
import { ShareQrDialog } from "@/components/share/ShareQrDialog";
import { Icon } from "@/components/ui/icons";
import { OptimizedPhoto } from "@/components/ui/OptimizedPhoto";
import { compressImage, type ImageCompressionMetrics } from "@/lib/image";
import { toOptimizedUploadFile, uploadFile } from "@/lib/upload";

const STORAGE_KEY = "koi.miss_you.draft";

export type MissYouEditorPhotoItem =
  | string
  | {
      url: string;
      caption?: string;
      focalPoint?: string;
      width?: number;
      height?: number;
    };

export function getMissYouPhotoUrl(item: MissYouEditorPhotoItem): string {
  return typeof item === "string" ? item : item.url;
}

export function getMissYouPhotoCaption(item: MissYouEditorPhotoItem): string {
  return typeof item === "string" ? "" : item.caption || "";
}

export interface MissYouEditorValues {
  recipientName: string;
  senderName: string;
  headline: string;
  distanceNote: string;
  letter: string;
  reminders: string[];
  reunionWish: string;
  themeId: MissYouThemeId;
  photoLayout: MissYouPhotoLayout;
  photos: MissYouEditorPhotoItem[];
  audio: MissYouAudioId;
}

const EMPTY: MissYouEditorValues = {
  recipientName: "",
  senderName: "",
  headline: "",
  distanceNote: "",
  letter: "",
  reminders: [],
  reunionWish: "",
  themeId: "dusk-postage",
  photoLayout: "postcards",
  photos: [],
  audio: "none",
};

const DISTANCE_CHIPS = [
  "Miles apart",
  "Counting the days",
  "Different timezones",
  "Too quiet without you",
] as const;

const AUDIO_OPTIONS: ReadonlyArray<{ id: MissYouAudioId; label: string }> = [
  { id: "none", label: "Silent" },
  ...MUSIC_TRACKS.filter((track) =>
    (MISS_YOU_AUDIO_IDS as readonly string[]).includes(track.id),
  ).map((track) => ({ id: track.id as MissYouAudioId, label: track.title })),
];

const STAGES = [
  { id: "who", num: 1, label: "Who & Where", shortLabel: "Distance" },
  { id: "theme", num: 2, label: "Atmosphere", shortLabel: "Theme" },
  { id: "words", num: 3, label: "Words & Details", shortLabel: "Words" },
  { id: "memories", num: 4, label: "Photos & Publish", shortLabel: "Photos" },
] as const;

function loadDraft(): MissYouEditorValues | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MissYouEditorValues>;
    return {
      recipientName: parsed.recipientName ?? "",
      senderName: parsed.senderName ?? "",
      headline: parsed.headline ?? "",
      distanceNote: parsed.distanceNote ?? "",
      letter: parsed.letter ?? "",
      reminders: Array.isArray(parsed.reminders)
        ? parsed.reminders.filter((r): r is string => typeof r === "string")
        : [],
      reunionWish: parsed.reunionWish ?? "",
      themeId: parsed.themeId ?? "dusk-postage",
      photoLayout:
        parsed.photoLayout && MISS_YOU_PHOTO_LAYOUTS.includes(parsed.photoLayout)
          ? parsed.photoLayout
          : "postcards",
      photos: Array.isArray(parsed.photos)
        ? parsed.photos.filter((p) => {
            if (typeof p === "string") return Boolean(p.trim());
            if (p && typeof p === "object" && typeof p.url === "string") return Boolean(p.url.trim());
            return false;
          })
        : [],
      audio: parsed.audio ?? "none",
    };
  } catch {
    return null;
  }
}

function saveDraftLocal(values: MissYouEditorValues) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Ignore storage unavailability in restricted contexts
  }
}

export interface MissYouEditorProps {
  initialValues?: Partial<MissYouEditorValues>;
  initialDraftId?: string;
  signedIn?: boolean;
  isLoadingSession?: boolean;
  onPublishResponse?: (content: MissYouContent) => Promise<{ path: string; publicToken: string }>;
  onUploadPhoto?: (file: File) => Promise<{ url: string }>;
  onCancel?: () => void;
  isResponse?: boolean;
}

export function MissYouEditor({
  initialValues,
  initialDraftId,
  signedIn = false,
  isLoadingSession = false,
  onPublishResponse,
  onUploadPhoto,
  onCancel,
  isResponse = false,
}: MissYouEditorProps = {}) {
  const router = useRouter();
  const [values, setValues] = useState<MissYouEditorValues>(() => ({
    ...EMPTY,
    ...initialValues,
    reminders: initialValues?.reminders ?? [],
    photoLayout: initialValues?.photoLayout ?? "postcards",
    photos: initialValues?.photos ?? [],
    audio: initialValues?.audio ?? "none",
  }));
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [activeStage, setActiveStage] = useState<number>(1);
  const [fullPreview, setFullPreview] = useState(false);

  // Reminder builder input
  const [reminderInput, setReminderInput] = useState("");

  // Photo optimization & upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoStageLabel, setPhotoStageLabel] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lastMetric, setLastMetric] = useState<ImageCompressionMetrics | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [urlMode, setUrlMode] = useState<"auto" | "open" | "closed">("auto");
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      photoAbortRef.current?.abort();
    };
  }, []);

  const authState: "loading" | "authenticated" | "unauthenticated" = useMemo(() => {
    if (sessionExpired) return "unauthenticated";
    if (isLoadingSession) return "loading";
    if (signedIn) return "authenticated";
    return "unauthenticated";
  }, [sessionExpired, isLoadingSession, signedIn]);

  const currentTheme = resolveMissYouTheme(values.themeId);
  const isUrlOpen =
    urlMode === "open" || (urlMode === "auto" && !onUploadPhoto && authState === "unauthenticated");

  const previewContent: MissYouContent = useMemo(
    () => ({
      recipientName: values.recipientName.trim() || "Maya",
      senderName: values.senderName.trim() || "Kabir",
      headline: values.headline.trim() || "Wish you were sitting across from me",
      distanceNote: values.distanceNote.trim() || undefined,
      letter:
        values.letter.trim() ||
        "Even when the days get loud and full, there is a corner of every evening that still saves itself for you.",
      reminders: (values.reminders || []).filter((r) => Boolean(r.trim())),
      reunionWish: values.reunionWish.trim() || undefined,
      themeId: values.themeId,
      photoLayout: values.photoLayout,
      photos: values.photos || [],
      audio: values.audio,
    }),
    [values],
  );

  useEffect(() => {
    if (isResponse || initialDraftId) return;
    const stored = loadDraft();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(stored);
      setRestored(true);
    }
  }, [isResponse, initialDraftId]);

  useEffect(() => {
    if (isResponse) return;
    saveDraftLocal(values);
  }, [values, isResponse]);

  function set<K extends keyof MissYouEditorValues>(key: K, value: MissYouEditorValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleAddReminder() {
    const trimmed = reminderInput.trim();
    if (!trimmed) return;
    if ((values.reminders?.length || 0) >= 3) return;
    set("reminders", [...(values.reminders || []), trimmed.slice(0, 120)]);
    setReminderInput("");
  }

  function handleRemoveReminder(index: number) {
    set(
      "reminders",
      (values.reminders || []).filter((_, i) => i !== index),
    );
  }

  async function processFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const remainingSlots = 5 - (values.photos?.length || 0);
    if (remainingSlots <= 0) {
      setPhotoError("Maximum of 5 photos reached.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const chosenFiles = Array.from(files).slice(0, remainingSlots);
    if (!onUploadPhoto) {
      if (authState === "loading") {
        setPhotoError("Checking account status. Please try again in a moment.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (authState !== "authenticated") {
        setPhotoError("Sign in to upload photos to your account, or add an image link.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    photoAbortRef.current?.abort();
    const controller = new AbortController();
    photoAbortRef.current = controller;

    // Seed valid server draft defaults when an authenticated creator attaches photos before Step 1.
    const draftRecipient = values.recipientName.trim() || "Friend";
    const draftSender = values.senderName.trim() || "Me";
    const draftHeadline = values.headline.trim() || previewContent.headline;
    const draftLetter = values.letter.trim() || previewContent.letter;

    setUploadingPhoto(true);
    try {
      let activeId = draftId;
      if (!onUploadPhoto && !activeId) {
        const res = await fetch("/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            experienceType: "miss-you",
            content: {
              ...previewContent,
              recipientName: draftRecipient,
              senderName: draftSender,
              headline: draftHeadline,
              letter: draftLetter,
            },
          }),
          signal: controller.signal,
        });

        if (res.status === 401) {
          setSessionExpired(true);
          setPhotoError("Your session has expired. Sign in to upload photos.");
          return;
        }

        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? "Could not initialize draft for upload.");
        activeId = payload.draft.id as string;
        setDraftId(activeId);
      }

      const newItems: MissYouEditorPhotoItem[] = [];
      for (let i = 0; i < chosenFiles.length; i += 1) {
        const file = chosenFiles[i]!;
        if (controller.signal.aborted) break;
        setPhotoStageLabel(`Optimizing ${i + 1}/${chosenFiles.length}…`);
        const compressed = await compressImage(file, { signal: controller.signal });
        if (controller.signal.aborted) break;
        setLastMetric(compressed.metrics);
        const optimizedFile = toOptimizedUploadFile(
          compressed.blob,
          file.name || "moment",
          compressed.type,
        );
        setPhotoStageLabel(`Uploading ${i + 1}/${chosenFiles.length}…`);
        const uploaded = onUploadPhoto
          ? await onUploadPhoto(optimizedFile)
          : await uploadFile(
              optimizedFile,
              "photo",
              optimizedFile.name,
              activeId!,
              controller.signal,
            );
        if (uploaded?.url) {
          newItems.push({
            url: uploaded.url,
            caption: "",
            width: compressed.width,
            height: compressed.height,
          });
        }
      }

      if (controller.signal.aborted || newItems.length === 0) return;
      const updatedPhotos = [...(values.photos || []), ...newItems].slice(0, 5);
      set("photos", updatedPhotos);

      if (!onUploadPhoto && activeId) {
        const patchRes = await fetch(`/api/experiences/miss-you/${activeId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            content: {
              ...previewContent,
              recipientName: draftRecipient,
              senderName: draftSender,
              headline: draftHeadline,
              letter: draftLetter,
              photos: updatedPhotos,
            },
          }),
          signal: controller.signal,
        });

        if (patchRes.status === 401) {
          setSessionExpired(true);
          setPhotoError("Your session has expired. Sign in again to save uploaded photos.");
        } else if (!patchRes.ok) {
          const patchPayload = await patchRes.json().catch(() => null);
          setPhotoError(
            (patchPayload && typeof patchPayload.error === "string"
              ? patchPayload.error
              : null) ?? "Photo uploaded, but could not sync to your draft yet.",
          );
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPhotoError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
      setPhotoStageLabel(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    void processFiles(e.target.files);
  }

  function handleAddPhotoUrl() {
    const trimmed = photoUrlInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 2048) {
      setPhotoError("Photo URL must be under 2048 characters.");
      return;
    }
    if ((values.photos?.length || 0) >= 5) {
      setPhotoError("Maximum of 5 photos reached.");
      return;
    }
    setPhotoError(null);
    set("photos", [...(values.photos || []), { url: trimmed, caption: "" }]);
    setPhotoUrlInput("");
  }

  function handleMovePhoto(index: number, direction: "prev" | "next") {
    const list = [...(values.photos || [])];
    const target = direction === "prev" ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const temp = list[index]!;
    list[index] = list[target]!;
    list[target] = temp;
    set("photos", list);
  }

  function handleUpdatePhotoCaption(index: number, caption: string) {
    const list = [...(values.photos || [])];
    const current = list[index];
    if (!current) return;
    if (typeof current === "string") {
      list[index] = { url: current, caption: caption.slice(0, 120) };
    } else {
      list[index] = { ...current, caption: caption.slice(0, 120) };
    }
    set("photos", list);
  }

  function handleRemovePhoto(indexToRemove: number) {
    set(
      "photos",
      (values.photos || []).filter((_, idx) => idx !== indexToRemove),
    );
  }

  const parsed = missYouContentSchema.safeParse({
    recipientName: values.recipientName,
    senderName: values.senderName,
    headline: values.headline,
    distanceNote: values.distanceNote.trim() || undefined,
    letter: values.letter,
    reminders: (values.reminders || []).filter((r) => Boolean(r.trim())),
    reunionWish: values.reunionWish.trim() || undefined,
    themeId: values.themeId,
    photoLayout: values.photoLayout,
    photos: values.photos || [],
    audio: values.audio,
  });

  function scrollToStage(num: number, id: string) {
    setActiveStage(num);
    const el = document.getElementById(`missyou-stage-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(publish: boolean) {
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaveSuccess(false);

    try {
      if (isResponse && onPublishResponse) {
        const res = await onPublishResponse(parsed.data);
        setPublished(res.path);
        return;
      }

      if (authState === "loading") {
        setError("Checking your account session. Try again in a moment.");
        return;
      }

      let activeId = draftId;
      if (activeId) {
        const res = await fetch(`/api/experiences/miss-you/${activeId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: parsed.data }),
        });

        if (res.status === 401) {
          setSessionExpired(true);
          setError("Your session has expired. Sign in to save.");
          if (publish) {
            router.push(`/auth/sign-in?callbackURL=${encodeURIComponent("/create/miss-you")}`);
          }
          return;
        }

        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? "Could not update the draft.");
      } else {
        const created = await fetch("/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ experienceType: "miss-you", content: parsed.data }),
        });

        if (created.status === 401) {
          setSessionExpired(true);
          setError("Your session has expired. Sign in to save.");
          if (publish) {
            router.push(`/auth/sign-in?callbackURL=${encodeURIComponent("/create/miss-you")}`);
          }
          return;
        }

        const payload = await created.json();
        if (!created.ok) throw new Error(payload.error ?? "Could not save the draft.");
        activeId = payload.draft.id as string;
        setDraftId(activeId);
      }

      setSessionExpired(false);

      if (publish && activeId) {
        const res = await fetch(`/api/drafts/${activeId}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 7 }),
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error ?? "Could not publish.");
        setPublished(out.path as string);
        window.sessionStorage.removeItem(STORAGE_KEY);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (published && !isResponse) {
    return (
      <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm border border-[#ebd5df]">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#9f3e67]">
          Dispatch ready to send
        </p>
        <p className="break-all rounded-2xl bg-[#fdf5f8] p-4 font-mono text-sm text-[#2f1b28] border border-[#ebd5df]">
          {published}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <a
            href={published}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#9f3e67] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Open experience
          </a>
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="rounded-full border border-[#9f3e67] px-5 py-2.5 text-sm font-semibold text-[#9f3e67] transition hover:bg-[#fdf5f8] cursor-pointer"
          >
            Share QR
          </button>
        </div>
        {showQr ? (
          <ShareQrDialog
            path={published}
            experienceType="miss-you"
            onClose={() => setShowQr(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {restored ? (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs ${
            authState === "authenticated"
              ? "border-purple-200 bg-purple-50/80 text-purple-900"
              : "border-rose-200 bg-rose-50/80 text-rose-900"
          }`}
        >
          <span>
            {authState === "authenticated" ? (
              "Draft restored from this browser. Ready to save to your account."
            ) : authState === "loading" ? (
              "Draft restored from this browser."
            ) : (
              <>
                Draft restored from this browser.{" "}
                <a
                  href="/auth/sign-in?callbackURL=%2Fcreate%2Fmiss-you"
                  className="font-semibold underline"
                >
                  Sign in
                </a>{" "}
                to save it to your account.
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => setRestored(false)}
            aria-label="Dismiss notice"
            className="font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      ) : null}

      {/* Stage Rail */}
      <nav aria-label="Creation steps" className={isResponse ? "relative z-20" : "sticky top-2 z-30"}>
        <ol className="flex w-full items-center gap-1 rounded-full bg-white/95 p-1.5 backdrop-blur-md shadow-xs border border-[#ece2f6]">
          {STAGES.map((stage) => {
            const active = activeStage === stage.num;
            return (
              <li key={stage.id} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => scrollToStage(stage.num, stage.id)}
                  className={`flex w-full items-center justify-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-[#9f3e67] text-white shadow-xs"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <span className="truncate">
                    <span className="sm:hidden">{stage.shortLabel}</span>
                    <span className="hidden sm:inline">{stage.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px] items-start">
        {/* Left: Stages 1-4 Controls */}
        <div className="space-y-5">
          {/* Stage 1: Who & Across Distance */}
          <section
            id="missyou-stage-who"
            className="scroll-mt-20 space-y-4 sm:space-y-5 rounded-3xl bg-white p-4 sm:p-6 shadow-xs border border-[#ece2f6]"
          >
            <div className="border-b border-stone-100 pb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9f3e67]">
                Step 1 of 4
              </p>
              <h2 className="text-lg font-semibold text-[#2f1b28]">Who & Where</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                  Their name
                </span>
                <input
                  value={values.recipientName}
                  onChange={(e) => set("recipientName", e.target.value)}
                  required
                  maxLength={60}
                  placeholder="Who are you missing?"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-[#9f3e67] focus:outline-none focus:ring-1 focus:ring-[#9f3e67]"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                  Your name
                </span>
                <input
                  value={values.senderName}
                  onChange={(e) => set("senderName", e.target.value)}
                  required
                  maxLength={60}
                  placeholder="How should you sign off?"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-[#9f3e67] focus:outline-none focus:ring-1 focus:ring-[#9f3e67]"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                  Distance or time apart (optional)
                </span>
                <input
                  value={values.distanceNote}
                  onChange={(e) => set("distanceNote", e.target.value)}
                  maxLength={60}
                  placeholder="e.g. 2,100 km away · 18 days apart"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-[#9f3e67] focus:outline-none focus:ring-1 focus:ring-[#9f3e67]"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DISTANCE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => set("distanceNote", chip)}
                    className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:border-[#9f3e67] hover:text-[#9f3e67] transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                  Headline
                </span>
                <span className="text-[11px] text-stone-400">{values.headline.length} / 80</span>
              </div>
              <input
                value={values.headline}
                onChange={(e) => set("headline", e.target.value)}
                required
                maxLength={80}
                placeholder="e.g. Wish you were sitting across from me"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-[#9f3e67] focus:outline-none focus:ring-1 focus:ring-[#9f3e67]"
              />
            </label>
          </section>

          {/* Stage 2: Atmosphere & Soundtrack */}
          <section
            id="missyou-stage-theme"
            className="scroll-mt-20 space-y-4 sm:space-y-5 rounded-3xl bg-white p-4 sm:p-6 shadow-xs border border-[#ece2f6]"
          >
            <div className="border-b border-stone-100 pb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9f3e67]">
                Step 2 of 4
              </p>
              <h2 className="text-lg font-semibold text-[#2f1b28]">World & Atmosphere</h2>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {MISS_YOU_THEMES.map((theme) => {
                const selected = values.themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => set("themeId", theme.id)}
                    aria-pressed={selected}
                    className={`flex flex-col text-left rounded-2xl border p-3.5 transition cursor-pointer ${
                      selected
                        ? "border-[#9f3e67] ring-1 ring-[#9f3e67] bg-[#fdf5f8]"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-semibold text-[#2f1b28]">{theme.name}</span>
                      <span className="flex gap-1 shrink-0">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/10"
                          style={{ background: theme.palette.background }}
                        />
                        <span
                          className="h-3.5 w-3.5 rounded-full"
                          style={{ background: theme.palette.primary }}
                        />
                      </span>
                    </div>
                    <span className="mt-1 text-xs text-stone-500 leading-snug">
                      {theme.tagline}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-100">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                Ambient Music (optional)
              </span>
              <div className="flex flex-wrap gap-2">
                {AUDIO_OPTIONS.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => set("audio", track.id)}
                    aria-pressed={values.audio === track.id}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      values.audio === track.id
                        ? "border-[#9f3e67] bg-[#fdf5f8] text-[#9f3e67]"
                        : "border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {track.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Stage 3: Letter, Everyday Reminders & Reunion Wish */}
          <section
            id="missyou-stage-words"
            className="scroll-mt-20 space-y-4 sm:space-y-5 rounded-3xl bg-white p-4 sm:p-6 shadow-xs border border-[#ece2f6]"
          >
            <div className="border-b border-stone-100 pb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9f3e67]">
                Step 3 of 4
              </p>
              <h2 className="text-lg font-semibold text-[#2f1b28]">Your Note & Reminders</h2>
            </div>

            <label className="block space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                  Personal Note
                </span>
                <span className="text-[11px] text-stone-400">{values.letter.length} / 800</span>
              </div>
              <textarea
                value={values.letter}
                onChange={(e) => set("letter", e.target.value)}
                required
                rows={5}
                maxLength={800}
                placeholder="Write honestly about missing them, what feels different right now, or what you want them to carry..."
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-[#9f3e67] focus:outline-none focus:ring-1 focus:ring-[#9f3e67]"
              />
            </label>

            {/* Little Reminders (0-3 items) */}
            <div className="space-y-2.5 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                  Little things that reminded me of you (optional)
                </span>
                <span className="text-[11px] text-stone-400">
                  {values.reminders?.length || 0} / 3
                </span>
              </div>

              {(values.reminders?.length || 0) > 0 && (
                <ul className="space-y-2">
                  {values.reminders.map((item, idx) => (
                    <li
                      key={`rem-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800"
                    >
                      <span className="truncate">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveReminder(idx)}
                        aria-label={`Remove reminder ${idx + 1}`}
                        className="text-stone-400 hover:text-rose-600 shrink-0 cursor-pointer"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {(values.reminders?.length || 0) < 3 && (
                <div className="flex items-center gap-2">
                  <input
                    value={reminderInput}
                    onChange={(e) => setReminderInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddReminder();
                      }
                    }}
                    maxLength={120}
                    placeholder="e.g. Someone ordered your favorite tea..."
                    className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-[#9f3e67] focus:outline-none focus:ring-1 focus:ring-[#9f3e67]"
                  />
                  <button
                    type="button"
                    onClick={handleAddReminder}
                    disabled={!reminderInput.trim()}
                    aria-label="Add reminder"
                    className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
                  >
                    <Icon name="plus" size={13} />
                    <span>Add</span>
                  </button>
                </div>
              )}
            </div>

            <label className="block space-y-1.5 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                  When we meet again (optional)
                </span>
                <span className="text-[11px] text-stone-400">
                  {values.reunionWish.length} / 240
                </span>
              </div>
              <input
                value={values.reunionWish}
                onChange={(e) => set("reunionWish", e.target.value)}
                maxLength={240}
                placeholder="e.g. First thing when you land: slow coffee and zero clocks."
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-[#9f3e67] focus:outline-none focus:ring-1 focus:ring-[#9f3e67]"
              />
            </label>
          </section>

          {/* Stage 4: Photos & Publish */}
          <section
            id="missyou-stage-memories"
            className="scroll-mt-20 space-y-4 sm:space-y-5 rounded-3xl bg-white p-4 sm:p-6 shadow-xs border border-[#ece2f6]"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9f3e67]">
                  Step 4 of 4
                </p>
                <h2 className="text-lg font-semibold text-[#2f1b28]">Photos & Publish</h2>
              </div>
              <span className="text-xs font-medium text-stone-500">
                {values.photos?.length || 0} / 5 photos
              </span>
            </div>

            {/* Photographs Dropzone & Controls (shown first so photo attachment is unmistakable) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                  Photographs (optional · {values.photos?.length || 0} / 5)
                </span>
                <span className="text-[11px] text-stone-500">
                  Resized &amp; compressed to WebP before upload
                </span>
              </div>

              {!onUploadPhoto && authState === "unauthenticated" && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                  <span>
                    Sign in to upload files from your device, or paste an image URL below to preview.
                  </span>
                  <a
                    href="/auth/sign-in?callbackURL=%2Fcreate%2Fmiss-you"
                    className="font-semibold text-[#9f3e67] underline underline-offset-2"
                  >
                    Sign in
                  </a>
                </div>
              )}

              {/* Attached Photos */}
              {(values.photos?.length || 0) > 0 && (
                <div className="space-y-2.5">
                  {values.photos.map((item, idx) => {
                    const url = getMissYouPhotoUrl(item);
                    const caption = getMissYouPhotoCaption(item);
                    return (
                      <div
                        key={`missyou-photo-${idx}`}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-200">
                            <OptimizedPhoto
                              src={url}
                              alt={caption || `Photo ${idx + 1}`}
                              priority
                              compactFallback
                              className="object-cover"
                            />
                          </div>
                          <div className="flex sm:flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => handleMovePhoto(idx, "prev")}
                              disabled={idx === 0}
                              aria-label={`Move photo ${idx + 1} earlier`}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 disabled:opacity-30 cursor-pointer"
                            >
                              <Icon name="chevron-left" size={12} className="sm:rotate-90" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePhoto(idx, "next")}
                              disabled={idx === values.photos.length - 1}
                              aria-label={`Move photo ${idx + 1} later`}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 disabled:opacity-30 cursor-pointer"
                            >
                              <Icon name="chevron-right" size={12} className="sm:rotate-90" />
                            </button>
                          </div>
                        </div>

                        <input
                          value={caption}
                          onChange={(e) => handleUpdatePhotoCaption(idx, e.target.value)}
                          placeholder="Optional caption or memory..."
                          maxLength={120}
                          aria-label={`Caption for photo ${idx + 1}`}
                          className="flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-[#9f3e67] focus:outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          aria-label={`Remove photo ${idx + 1}`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 cursor-pointer"
                        >
                          <Icon name="trash" size={13} />
                          <span className="sm:hidden">Remove</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload Controls */}
              {(values.photos?.length || 0) < 5 && (
                <div className="space-y-2.5">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingPhoto(true);
                    }}
                    onDragLeave={() => setIsDraggingPhoto(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingPhoto(false);
                      void processFiles(e.dataTransfer.files);
                    }}
                    className={`rounded-2xl border-2 border-dashed p-4 sm:p-5 text-center transition ${
                      isDraggingPhoto
                        ? "border-[#9f3e67] bg-[#fdf5f8]"
                        : "border-[#dfc8db] bg-[#fcf9fc] hover:border-[#9f3e67]/60"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple={(values.photos?.length || 0) < 4}
                      onChange={handleFileSelect}
                      className="sr-only"
                      id="missyou-photo-upload"
                    />
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#9f3e67]/10 text-[#9f3e67]">
                        <Icon name="image" size={18} />
                      </span>
                      <p className="text-sm font-semibold text-[#2f1b28]">
                        {(values.photos?.length || 0) === 0
                          ? "Attach photographs to this note"
                          : `Add more photos (${5 - (values.photos?.length || 0)} left)`}
                      </p>
                      <p className="text-xs text-stone-500">
                        Drag and drop JPEG, PNG, or WebP files here, or choose from your device.
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
                        <label
                          htmlFor="missyou-photo-upload"
                          className={`inline-flex items-center gap-1.5 rounded-full bg-[#9f3e67] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 cursor-pointer ${
                            uploadingPhoto ? "opacity-60 pointer-events-none" : ""
                          }`}
                        >
                          <Icon name="plus" size={13} />
                          <span>
                            {uploadingPhoto
                              ? (photoStageLabel ?? "Uploading…")
                              : "Choose photos from device"}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setUrlMode(isUrlOpen ? "closed" : "open")}
                          className="rounded-full border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
                        >
                          {isUrlOpen ? "Hide link option" : "Or add image URL"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isUrlOpen && (
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={photoUrlInput}
                        onChange={(e) => setPhotoUrlInput(e.target.value)}
                        placeholder="https://example.com/photo.webp"
                        maxLength={2048}
                        aria-label="Image URL"
                        className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-[#9f3e67] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddPhotoUrl}
                        disabled={!photoUrlInput.trim()}
                        className="rounded-lg bg-stone-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-900 disabled:opacity-40 cursor-pointer"
                      >
                        Add URL
                      </button>
                    </div>
                  )}
                </div>
              )}

              {lastMetric && (
                <p className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                  Optimized: {Math.round(lastMetric.originalBytes / 1024)} KB →{" "}
                  {Math.round(lastMetric.compressedBytes / 1024)} KB (
                  {lastMetric.outputFormat.replace("image/", "").toUpperCase()}, -
                  {lastMetric.reductionPercent}%)
                </p>
              )}

              {photoError && (
                <p
                  role="alert"
                  className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5"
                >
                  {photoError}
                </p>
              )}
            </div>

            {/* Presentation Style Picker */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                Gallery Presentation
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "postcards", label: "Postcards", desc: "Stamped parchment cards" },
                  { id: "polaroid", label: "Polaroids", desc: "Pinned archival prints" },
                  { id: "strips", label: "Filmstrip", desc: "35mm contact sheet" },
                  { id: "carousel", label: "Carousel", desc: "Window slideshow" },
                ].map((opt) => {
                  const isSelected = values.photoLayout === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => set("photoLayout", opt.id as MissYouPhotoLayout)}
                      aria-pressed={isSelected}
                      className={`flex flex-col text-left p-2.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "border-[#9f3e67] bg-[#fdf5f8] ring-1 ring-[#9f3e67]"
                          : "border-stone-200 bg-stone-50/80 hover:border-stone-300"
                      }`}
                    >
                      <span
                        className={`text-xs font-bold ${isSelected ? "text-[#9f3e67]" : "text-stone-800"}`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700"
              >
                {error}
              </p>
            )}

            {/* Auth Status + Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
              {isResponse && onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs font-medium text-stone-600 hover:underline cursor-pointer"
                >
                  Back
                </button>
              ) : !isResponse ? (
                authState === "authenticated" ? (
                  <div
                    className="flex items-center gap-2 text-xs text-[#6d3fa8]"
                    data-testid="auth-status-signed-in"
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-medium">Signed in to account</span>
                    {saveSuccess && (
                      <span className="ml-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[0.7rem] font-semibold text-emerald-700">
                        <Icon name="check" size={11} />
                        <span>Saved to account</span>
                      </span>
                    )}
                  </div>
                ) : authState === "loading" ? (
                  <div
                    className="h-4 w-28 animate-pulse rounded bg-stone-200"
                    data-testid="auth-status-loading"
                  />
                ) : (
                  <a
                    href="/auth/sign-in?callbackURL=%2Fcreate%2Fmiss-you"
                    className="text-xs font-medium text-[#6d3fa8] hover:underline"
                    data-testid="auth-status-sign-in"
                  >
                    Sign in to your account
                  </a>
                )
              ) : (
                <div />
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                {!isResponse ? (
                  <button
                    type="button"
                    disabled={busy || !parsed.success}
                    onClick={() => void submit(false)}
                    className="rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 cursor-pointer transition"
                  >
                    {busy ? "Saving…" : "Save to my account"}
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={busy || !parsed.success}
                  onClick={() => void submit(true)}
                  className="rounded-xl bg-[#9f3e67] px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-50 cursor-pointer transition"
                >
                  {isResponse ? "Publish Response" : "Publish Experience"}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Sticky Live Preview */}
        <aside className="lg:sticky lg:top-16 space-y-2.5">
          <div className="rounded-3xl border border-[#ece2f6] bg-white p-3.5 sm:p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9f3e67]">
                  Live Preview
                </p>
                <p className="text-xs font-medium text-stone-600">{currentTheme.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setFullPreview(true)}
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                <Icon name="eye" size={13} />
                <span>Full walkthrough</span>
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 shadow-inner max-h-[520px] overflow-y-auto">
              <MissYouLetter content={previewContent} variant="embedded" />
            </div>
          </div>
          {!isResponse && (
            <p className="text-center text-[11px] text-[#8a7a9c]">
              Private link stays active for 7 days — manage or delete it anytime.
            </p>
          )}
        </aside>
      </div>

      {/* Full-Screen Walkthrough Modal */}
      {fullPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Recipient Walkthrough Preview"
          className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/85 backdrop-blur-sm flex flex-col items-center p-3 sm:p-5"
        >
          <div className="sticky top-3 z-50 mb-3 flex items-center justify-between gap-4 rounded-full bg-white/95 backdrop-blur-md px-5 py-2 shadow-xl border border-stone-200 w-full max-w-[620px]">
            <span className="text-xs font-semibold text-stone-700">
              Recipient Walkthrough Preview
            </span>
            <button
              type="button"
              onClick={() => setFullPreview(false)}
              aria-label="Exit preview"
              className="rounded-full bg-stone-900 px-3.5 py-1 text-xs font-semibold text-white hover:bg-stone-800 transition cursor-pointer"
            >
              Exit Preview
            </button>
          </div>
          <div className="w-full max-w-[620px] overflow-hidden rounded-3xl shadow-2xl">
            <MissYouLetter content={previewContent} variant="modal" />
          </div>
        </div>
      )}
    </div>
  );
}
