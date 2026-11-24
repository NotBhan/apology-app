"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BirthdayLetter } from "@/components/presentation/BirthdayLetter";
import { BirthdayCake } from "@/components/presentation/birthday/BirthdayCake";
import {
  birthdayContentSchema,
  type BirthdayContent,
  type BirthdayThemeId,
} from "@/experiences/birthday/schema";
import { BIRTHDAY_THEMES, resolveBirthdayTheme } from "@/experiences/birthday/themes";
import { ShareQrDialog } from "@/components/share/ShareQrDialog";
import { Icon } from "@/components/ui/icons";
import { compressImage } from "@/lib/image";

const STORAGE_KEY = "koi.birthday.draft";

export interface BirthdayEditorValues {
  recipientName: string;
  senderName: string;
  headline: string;
  age?: number;
  themeId: BirthdayThemeId;
  message: string;
  wish: string;
  candleCount: number;
  photos: string[];
}

const EMPTY: BirthdayEditorValues = {
  recipientName: "",
  senderName: "",
  headline: "",
  age: undefined,
  themeId: "confetti",
  message: "",
  wish: "",
  candleCount: 3,
  photos: [],
};

function loadDraft(): BirthdayEditorValues | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BirthdayEditorValues>;
    return {
      recipientName: parsed.recipientName ?? "",
      senderName: parsed.senderName ?? "",
      headline: parsed.headline ?? "",
      age: typeof parsed.age === "number" ? parsed.age : undefined,
      themeId: parsed.themeId ?? "confetti",
      message: parsed.message ?? "",
      wish: parsed.wish ?? "",
      candleCount: typeof parsed.candleCount === "number" ? parsed.candleCount : 3,
      photos: Array.isArray(parsed.photos)
        ? parsed.photos.filter((p): p is string => typeof p === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function saveDraftLocal(values: BirthdayEditorValues) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // A blocked storage API must not break the editor.
  }
}

export interface BirthdayEditorProps {
  initialValues?: Partial<BirthdayEditorValues>;
  onPublishResponse?: (content: BirthdayContent) => Promise<{ path: string; publicToken: string }>;
  onUploadPhoto?: (file: File) => Promise<{ url: string }>;
  onCancel?: () => void;
  isResponse?: boolean;
}

const STAGES = [
  { id: "who", num: 1, label: "Who & When", shortLabel: "Who", subtitle: "Names & headline" },
  { id: "theme", num: 2, label: "Choose Theme", shortLabel: "Theme", subtitle: "Visual styling" },
  { id: "words", num: 3, label: "Words & Wish", shortLabel: "Words", subtitle: "Personal letter" },
  { id: "cake", num: 4, label: "Cake & Candles", shortLabel: "Cake", subtitle: "Decorate cake" },
  { id: "preview", num: 5, label: "Preview & Send", shortLabel: "Preview", subtitle: "Review gift" },
] as const;

export function BirthdayEditor({
  initialValues,
  onPublishResponse,
  onUploadPhoto,
  onCancel,
  isResponse = false,
}: BirthdayEditorProps = {}) {
  const router = useRouter();
  const [values, setValues] = useState<BirthdayEditorValues>(() => ({
    ...EMPTY,
    ...initialValues,
  }));
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [includeAge, setIncludeAge] = useState(() => typeof initialValues?.age === "number");
  const [activeStage, setActiveStage] = useState<number>(1);
  const [fullPreview, setFullPreview] = useState(false);

  // Photo management state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentTheme = resolveBirthdayTheme(values.themeId);

  const previewContent: BirthdayContent = useMemo(() => ({
    recipientName: values.recipientName.trim() || "Aria",
    senderName: values.senderName.trim() || "Leo",
    headline: values.headline.trim() || "Happy Birthday!",
    age: includeAge && typeof values.age === "number" && values.age > 0 ? values.age : undefined,
    themeId: values.themeId,
    message:
      values.message.trim() ||
      "Wishing you another wonderful year filled with happiness, adventures, and unforgettable moments!",
    wish: values.wish.trim() ? values.wish.trim() : undefined,
    candleCount: values.candleCount,
    photos: values.photos || [],
    audio: "none",
  }), [values, includeAge]);

  useEffect(() => {
    if (isResponse) return;
    const stored = loadDraft();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(stored);
      if (typeof stored.age === "number") {
        setIncludeAge(true);
      }
      setRestored(true);
    }
  }, [isResponse]);

  useEffect(() => {
    if (isResponse) return;
    saveDraftLocal(values);
  }, [values, isResponse]);

  function set<K extends keyof BirthdayEditorValues>(key: K, value: BirthdayEditorValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const remainingSlots = 5 - (values.photos?.length || 0);
    if (remainingSlots <= 0) {
      setPhotoError("Maximum of 5 photos reached.");
      return;
    }

    const chosenFiles = Array.from(files).slice(0, remainingSlots);

    if (!onUploadPhoto) {
      setPhotoError("Sign in to save uploaded photos with your gift, or add image links below.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadingPhoto(true);
    try {
      const newUrls: string[] = [];
      for (const file of chosenFiles) {
        let uploadPayload: File = file;
        try {
          const compressed = await compressImage(file);
          uploadPayload = new File([compressed.blob], file.name || "moment.jpg", {
            type: compressed.type,
          });
        } catch {
          // Fallback to original file if compression fails (e.g. test environment)
          uploadPayload = file;
        }
        const res = await onUploadPhoto(uploadPayload);
        if (res?.url) newUrls.push(res.url);
      }
      set("photos", [...(values.photos || []), ...newUrls].slice(0, 5));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
    set("photos", [...(values.photos || []), trimmed]);
    setPhotoUrlInput("");
  }

  function handleRemovePhoto(indexToRemove: number) {
    set("photos", (values.photos || []).filter((_, idx) => idx !== indexToRemove));
  }

  const parsed = birthdayContentSchema.safeParse({
    recipientName: values.recipientName,
    senderName: values.senderName,
    headline: values.headline,
    age: includeAge && values.age ? values.age : undefined,
    themeId: values.themeId,
    message: values.message,
    wish: values.wish.trim() ? values.wish.trim() : undefined,
    candleCount: values.candleCount,
    photos: values.photos || [],
    audio: "none",
  });

  function scrollToStage(num: number, id: string) {
    setActiveStage(num);
    const element = document.getElementById(`stage-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function submit(publish: boolean) {
    setBusy(true);
    setError(null);

    if (!parsed.success) {
      setError("Please complete all required fields (names, headline, message) before publishing.");
      setBusy(false);
      return;
    }

    if (!isResponse) {
      saveDraftLocal(values);
    }

    try {
      if (onPublishResponse && publish) {
        const result = await onPublishResponse(parsed.data);
        setPublished(result.path);
        return;
      }

      const created = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ experienceType: "birthday", content: parsed.data }),
      });

      if (created.status === 401) {
        router.push(`/auth/sign-in?callbackURL=${encodeURIComponent("/create/birthday")}`);
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

  return (
    <div className="space-y-6">
      {/* Restored from Storage Notice */}
      {restored ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900">
          <span>Draft restored from this browser. Sign in to save it to your account.</span>
          <button
            type="button"
            onClick={() => setRestored(false)}
            aria-label="Dismiss notice"
            className="text-amber-700 hover:text-amber-900 font-bold"
          >
            ×
          </button>
        </div>
      ) : null}

      {/* Staged Creation Navigation Bar */}
      <nav
        aria-label="Creation stages"
        className="sticky top-16 z-20 py-2 bg-[#faf6ff]/95 backdrop-blur-md border-b border-stone-200/60 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ol className="flex items-center justify-between gap-1 sm:gap-2 w-full">
          {STAGES.map((s) => {
            const isActive = activeStage === s.num;
            return (
              <li key={s.id} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => scrollToStage(s.num, s.id)}
                  className={`flex w-full items-center justify-center gap-1 sm:gap-1.5 rounded-full px-1.5 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#e8590c] text-white shadow-sm scale-[1.02]"
                      : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white text-[#e8590c]" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {s.num}
                  </span>
                  <span className="truncate">
                    <span className="md:hidden">{s.shortLabel}</span>
                    <span className="hidden md:inline">{s.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Stage 1: Who & When */}
      <section
        id="stage-who"
        className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-5"
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e8590c]">
              Stage 1 of 5
            </span>
            <h2 className="text-base font-semibold text-stone-900">Who is this celebration for?</h2>
          </div>
          <span className="text-xs text-stone-400 font-medium">Names & Headline</span>
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
              placeholder="e.g. Maya"
              maxLength={60}
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm transition focus:border-[#e8590c] focus:outline-none focus:ring-1 focus:ring-[#e8590c]"
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
              placeholder="e.g. Liam"
              maxLength={60}
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm transition focus:border-[#e8590c] focus:outline-none focus:ring-1 focus:ring-[#e8590c]"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
            Headline
          </span>
          <input
            value={values.headline}
            onChange={(e) => set("headline", e.target.value)}
            required
            maxLength={80}
            placeholder="e.g. Happy 25th Birthday!"
            className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm transition focus:border-[#e8590c] focus:outline-none focus:ring-1 focus:ring-[#e8590c]"
          />
        </label>

        {/* Optional Age Toggle & Input */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAge}
              onChange={(e) => {
                setIncludeAge(e.target.checked);
                if (!e.target.checked) set("age", undefined);
              }}
              className="h-4 w-4 rounded border-stone-300 text-[#e8590c] focus:ring-[#e8590c]"
            />
            <span className="text-xs font-semibold text-stone-800">
              Include milestone age (optional)
            </span>
          </label>

          {includeAge && (
            <div className="pt-1.5 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-700">Age:</span>
                <input
                  type="number"
                  min={1}
                  max={130}
                  value={values.age ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number.parseInt(e.target.value, 10) : undefined;
                    set("age", val && !Number.isNaN(val) ? Math.max(1, Math.min(130, val)) : undefined);
                  }}
                  placeholder="e.g. 10"
                  className="w-24 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-900 transition focus:border-[#e8590c] focus:outline-none focus:ring-1 focus:ring-[#e8590c] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </label>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                <span className="text-[11px] text-stone-400">Popular:</span>
                {[10, 18, 21, 25, 30, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => set("age", preset)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition cursor-pointer ${
                      values.age === preset
                        ? "bg-[#e8590c] text-white"
                        : "bg-stone-200/60 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-stone-500">
            Age is optional — leave unchecked to celebrate without a number.
          </p>
        </div>
      </section>

      {/* Stage 2: Choose Theme */}
      <section
        id="stage-theme"
        className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-5"
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e8590c]">
              Stage 2 of 5
            </span>
            <h2 className="text-base font-semibold text-stone-900">Choose a visual theme</h2>
          </div>
          <span className="text-xs text-stone-400 font-medium">6 Custom Themes</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BIRTHDAY_THEMES.map((theme) => {
            const isSelected = values.themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => set("themeId", theme.id)}
                className={`group relative flex flex-col text-left rounded-xl p-4 border transition-all cursor-pointer ${
                  isSelected
                    ? "shadow-sm scale-[1.01]"
                    : "border-stone-200 hover:border-stone-300 hover:bg-stone-50/50"
                }`}
                style={{
                  background: isSelected ? theme.palette.surface : undefined,
                  borderColor: isSelected ? theme.palette.primary : undefined,
                  boxShadow: isSelected ? `0 0 0 2px ${theme.palette.primary}33` : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold transition-colors"
                    style={{ color: isSelected ? theme.palette.text : "#1c1917" }}
                  >
                    {theme.name}
                  </span>
                  {isSelected && (
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px]"
                      style={{ background: theme.palette.primary }}
                    >
                      <Icon name="check" size={12} />
                    </span>
                  )}
                </div>
                <p
                  className="mt-1 text-[11px] line-clamp-2 transition-colors"
                  style={{ color: isSelected ? theme.palette.mutedText : "#57534e" }}
                >
                  {theme.tagline}
                </p>

                {/* Palette Swatches */}
                <div className="mt-3 flex items-center gap-1.5">
                  <span
                    className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                    style={{ background: theme.palette.background }}
                    title="Background"
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                    style={{ background: theme.palette.primary }}
                    title="Primary"
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                    style={{ background: theme.palette.secondary }}
                    title="Secondary"
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                    style={{ background: theme.palette.accent }}
                    title="Accent"
                  />
                  <span
                    className="ml-auto text-[10px] font-semibold uppercase tracking-wider transition-colors"
                    style={{ color: isSelected ? theme.palette.mutedText : "#a8a29e" }}
                  >
                    {theme.envelope.sealSymbol}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Stage 3: Words & Wish */}
      <section
        id="stage-words"
        className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-5"
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e8590c]">
              Stage 3 of 5
            </span>
            <h2 className="text-base font-semibold text-stone-900">Your heartfelt message</h2>
          </div>
          <span className="text-xs text-stone-400 font-medium">Personal Letter</span>
        </div>

        <label className="block space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
              Message
            </span>
            <span className="text-[11px] text-stone-400">{values.message.length} / 600</span>
          </div>
          <textarea
            value={values.message}
            onChange={(e) => set("message", e.target.value)}
            required
            rows={5}
            maxLength={600}
            placeholder="Write something warm, memorable, and sincere..."
            className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm transition focus:border-[#e8590c] focus:outline-none focus:ring-1 focus:ring-[#e8590c]"
          />
        </label>

        <label className="block space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
              One wish (optional)
            </span>
            <span className="text-[11px] text-stone-400">{values.wish.length} / 200</span>
          </div>
          <input
            value={values.wish}
            onChange={(e) => set("wish", e.target.value)}
            maxLength={200}
            placeholder="e.g. May this year be filled with laughter and triumphs."
            className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm transition focus:border-[#e8590c] focus:outline-none focus:ring-1 focus:ring-[#e8590c]"
          />
          <p className="text-[11px] text-stone-500">
            A special closing wish or inside joke that appears at the finale.
          </p>
        </label>

        {/* Photos & Moments (Optional, up to 5) */}
        <div className="space-y-3 pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
              Celebration Moments (optional)
            </span>
            <span className="text-[11px] text-stone-400 font-medium">
              {values.photos?.length || 0} / 5 photos
            </span>
          </div>
          <p className="text-[11px] text-stone-500">
            Attach up to 5 memories to feature in the celebration moments gallery and personal letter envelope.
          </p>

          {/* Photo Thumbnails Grid */}
          {(values.photos?.length || 0) > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {values.photos.map((photoUrl, idx) => (
                <div
                  key={`photo-slot-${idx}`}
                  className="group relative aspect-video overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={`Moment ${idx + 1}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-stone-900/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      aria-label={`Remove photo ${idx + 1}`}
                      className="rounded-full bg-red-600 p-1.5 text-white shadow-md hover:bg-red-700 transition cursor-pointer"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-stone-900/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Photo Actions */}
          {(values.photos?.length || 0) < 5 && (
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple={(values.photos?.length || 0) < 4}
                  onChange={handleFileSelect}
                  className="sr-only"
                  id="birthday-photo-upload-input"
                />
                <label
                  htmlFor="birthday-photo-upload-input"
                  className={`inline-flex items-center gap-1.5 rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 hover:border-stone-400 cursor-pointer ${
                    uploadingPhoto ? "opacity-60 pointer-events-none" : ""
                  }`}
                >
                  <Icon name="image" size={14} className="text-stone-500" />
                  <span>{uploadingPhoto ? "Uploading..." : "Upload photo"}</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800 transition cursor-pointer px-2 py-1"
                >
                  <span>{showUrlInput ? "Hide link option" : "Or add image URL"}</span>
                </button>
              </div>

              {showUrlInput && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    maxLength={2048}
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-[#e8590c] focus:outline-none focus:ring-1 focus:ring-[#e8590c]"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    disabled={!photoUrlInput.trim()}
                    className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-900 transition disabled:opacity-40 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )}

          {photoError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
              {photoError}
            </p>
          )}
        </div>
      </section>

      {/* Stage 4: Cake & Candles */}
      <section
        id="stage-cake"
        className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-5"
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e8590c]">
              Stage 4 of 5
            </span>
            <h2 className="text-base font-semibold text-stone-900">Decorate their birthday cake</h2>
          </div>
          <span className="text-xs text-stone-400 font-medium">Interactive Cake</span>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
            Number of candles: <span className="text-[#e8590c]">{values.candleCount}</span>
          </span>
          <p className="text-xs text-stone-500">
            Select the number of candles (1 to 7). Candles are decorative and independent of age.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => {
              const isSelected = values.candleCount === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => set("candleCount", num)}
                  aria-pressed={isSelected}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#e8590c] text-white shadow-md scale-105"
                      : "border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-stone-100"
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Interactive Preview of Cake */}
        <div
          className="rounded-2xl border p-4 sm:p-6 flex flex-col items-center transition-colors"
          style={{
            background: currentTheme.palette.background,
            borderColor: currentTheme.palette.border,
            color: currentTheme.palette.text,
          }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-3 opacity-70"
            style={{ color: currentTheme.palette.mutedText }}
          >
            Cake Preview ({currentTheme.name})
          </p>
          <BirthdayCake theme={currentTheme} candleCount={values.candleCount} />
        </div>
      </section>

      {/* Stage 5: Preview & Send */}
      <section
        id="stage-preview"
        className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-7 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e8590c]">
              Stage 5 of 5
            </span>
            <h2 className="text-base font-semibold text-stone-900">Review their gift</h2>
          </div>
          <span className="text-xs text-stone-400 font-medium">Live Presentation</span>
        </div>

        {/* In-Editor Live Presentation Preview */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Interactive Preview {parsed.success ? "• Ready to send" : "• Live Draft"}
            </span>
            <button
              type="button"
              onClick={() => setFullPreview(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-1 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 transition cursor-pointer"
            >
              <Icon name="eye" size={13} />
              <span>Full screen walkthrough</span>
            </button>
          </div>

          {!parsed.success && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs text-amber-900">
              <span className="font-semibold shrink-0">Draft note:</span>
              <span>Showing live preview with placeholder text. Complete required fields above to publish.</span>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-stone-200 shadow-inner">
            <BirthdayLetter content={previewContent} />
          </div>
        </div>

        {/* Permanent Link Info Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900">
          <Icon name="lock" size={16} className="mt-0.5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-semibold text-emerald-950">Permanent gift link</p>
            <p className="mt-0.5 text-emerald-800">
              This birthday experience does not expire. It will remain accessible via its private URL.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        {/* Published Result */}
        {published ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-900 border border-green-200">
            <div>
              <p className="font-semibold">Your birthday gift is published!</p>
              <p className="font-mono text-xs text-green-700 mt-0.5">{published}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="rounded-full bg-green-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-800 transition"
            >
              Share QR
            </button>
          </div>
        ) : null}

        {showQr && published ? (
          <ShareQrDialog
            path={published}
            experienceType="birthday"
            onClose={() => setShowQr(false)}
          />
        ) : null}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-100">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap gap-2.5">
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
              className="rounded-xl bg-[#e8590c] px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#d9480f] disabled:opacity-50 cursor-pointer transition"
            >
              {isResponse ? "Publish Response" : "Publish Birthday Gift"}
            </button>
          </div>
        </div>
      </section>

      {/* Full-screen Walkthrough Modal */}
      {fullPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Recipient Walkthrough Preview"
          className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/85 backdrop-blur-sm flex flex-col items-center p-3 sm:p-6"
        >
          <div className="sticky top-3 z-50 mb-4 flex items-center justify-between gap-4 rounded-full bg-white/95 backdrop-blur-md px-5 py-2 shadow-xl border border-stone-200 w-full max-w-[620px]">
            <span className="text-xs font-semibold text-stone-700">Recipient Walkthrough Preview</span>
            <button
              type="button"
              onClick={() => setFullPreview(false)}
              aria-label="Exit preview"
              className="rounded-full bg-stone-900 px-3.5 py-1 text-xs font-semibold text-white hover:bg-stone-800 transition cursor-pointer"
            >
              Exit Preview
            </button>
          </div>
          <div className="w-full max-w-[620px] my-auto">
            <BirthdayLetter content={previewContent} />
          </div>
        </div>
      )}
    </div>
  );
}
