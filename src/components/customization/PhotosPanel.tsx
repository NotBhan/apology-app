"use client";

import { useEffect, useRef, useState } from "react";
import { motion, Reorder } from "framer-motion";
import type { PhotoAsset } from "@/types/apology";
import { compressImage } from "@/lib/image";
import { OptimizedPhoto } from "@/components/ui/OptimizedPhoto";
import { cn } from "@/lib/cn";

interface PhotosPanelProps {
  photos: PhotoAsset[];
  memoryStyle: "polaroid" | "scrapbook" | "slideshow";
  onChange: (photos: PhotoAsset[]) => void;
  onMemoryStyleChange: (style: "polaroid" | "scrapbook" | "slideshow") => void;
  onUpload: (blob: Blob, meta: { width: number; height: number; type: string }) => Promise<PhotoAsset>;
  onRemoveAsset?: (assetId: string) => Promise<void>;
}

const MAX_PHOTOS = 5;

export function PhotosPanel({
  photos,
  memoryStyle,
  onChange,
  onMemoryStyleChange,
  onUpload,
  onRemoveAsset,
}: PhotosPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setBusy(true);
    try {
      const slots = MAX_PHOTOS - photos.length;
      const chosen = Array.from(files).slice(0, Math.max(0, slots));
      const uploaded: PhotoAsset[] = [];
      for (let i = 0; i < chosen.length; i += 1) {
        const file = chosen[i]!;
        if (controller.signal.aborted) break;
        setStatusLabel(`Optimizing ${i + 1}/${chosen.length}…`);
        const compressed = await compressImage(file, { signal: controller.signal });
        if (controller.signal.aborted) break;
        setStatusLabel(`Uploading ${i + 1}/${chosen.length}…`);
        const asset = await onUpload(compressed.blob, {
          width: compressed.width,
          height: compressed.height,
          type: compressed.type,
        });
        uploaded.push(asset);
      }
      if (!controller.signal.aborted && uploaded.length > 0) {
        onChange([...photos, ...uploaded]);
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
      setStatusLabel(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function update(id: string, patch: Partial<PhotoAsset>) {
    onChange(photos.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)));
  }

  async function remove(id: string) {
    const target = photos.find((photo) => photo.id === id);
    setError(null);
    if (target?.url.startsWith("/api/uploads/") && onRemoveAsset) {
      setRemovingId(id);
      try {
        await onRemoveAsset(id);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not remove photo.");
        setRemovingId(null);
        return;
      }
      setRemovingId(null);
    }
    onChange(photos.filter((photo) => photo.id !== id));
  }

  function movePhoto(fromIndex: number, delta: number) {
    const toIndex = fromIndex + delta;
    if (toIndex < 0 || toIndex >= photos.length) return;
    const copy = [...photos];
    const [moved] = copy.splice(fromIndex, 1);
    if (!moved) return;
    copy.splice(toIndex, 0, moved);
    onChange(copy);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.82rem] font-semibold text-[#33203f]">
            {photos.length} of {MAX_PHOTOS} photos
          </p>
          <p className="text-[0.72rem] text-[#8a7a9c]">JPG, PNG or WebP · resized before upload</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={photos.length >= MAX_PHOTOS || busy}
          className="rounded-full bg-[#f2ecfa] px-4 py-2 text-[0.78rem] font-semibold text-[#5b3f7d] transition active:scale-95 disabled:opacity-40"
        >
          {busy ? statusLabel ?? "Working…" : "Add photos"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      {error ? <p role="alert" className="text-[0.75rem] text-[#b91c1c]">{error}</p> : null}

      {photos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#ddd0ec] px-4 py-8 text-center">
          <p className="text-[0.8rem] text-[#8a7a9c]">
            No photos yet. The memory scene is skipped without them.
          </p>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={photos}
          onReorder={onChange}
          className="space-y-3"
          as="ul"
        >
          {photos.map((photo, index) => (
            <Reorder.Item
              key={photo.id}
              value={photo}
              as="li"
              className="rounded-2xl border border-[#ece2f6] bg-white p-3"
              whileDrag={{ scale: 1.02, boxShadow: "0 18px 36px -22px rgba(60,30,90,0.5)" }}
            >
              <div className="flex gap-3">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f4eefb]">
                  <OptimizedPhoto
                    src={photo.url}
                    alt={photo.caption || `Photo ${index + 1}`}
                    focalPoint={photo.focalPoint ?? "50% 50%"}
                    priority
                    className="object-cover"
                    draggable={false}
                  />
                  <span className="absolute left-1 top-1 rounded bg-black/55 px-1 text-[0.6rem] text-white">
                    {index + 1}
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <label className="sr-only" htmlFor={`caption-${photo.id}`}>
                    Caption for photo {index + 1}
                  </label>
                  <input
                    id={`caption-${photo.id}`}
                    value={photo.caption ?? ""}
                    onChange={(event) => update(photo.id, { caption: event.target.value })}
                    placeholder="Add a caption…"
                    maxLength={120}
                    className="w-full rounded-xl border border-[#ece2f6] px-3 py-1.5 text-[0.78rem] text-[#33203f] outline-none focus:border-[#b18ade]"
                  />

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-[0.62rem] uppercase tracking-[0.12em] text-[#a394b4]">
                      focus
                    </span>
                    {[
                      { focal: "20% 20%", label: "Top-left" },
                      { focal: "50% 20%", label: "Top" },
                      { focal: "80% 20%", label: "Top-right" },
                      { focal: "50% 50%", label: "Center" },
                      { focal: "50% 80%", label: "Bottom" },
                    ].map(({ focal, label }) => {
                      const active = (photo.focalPoint ?? "50% 50%") === focal;
                      return (
                        <button
                          key={focal}
                          type="button"
                          onClick={() => update(photo.id, { focalPoint: focal })}
                          aria-label={`Set focus ${label} (${focal})`}
                          aria-pressed={active}
                          className="grid h-9 w-8 place-items-center rounded-lg hover:bg-[#f7f1ff]"
                        >
                          <span
                            className={cn(
                              "h-4 w-4 rounded-full border transition",
                              active
                                ? "scale-110 border-[#6d3fa8] bg-[#6d3fa8] ring-2 ring-[#e7dcf7]"
                                : "border-[#d8c9e8] bg-white",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => void remove(photo.id)}
                    disabled={removingId === photo.id}
                    className="rounded-full px-2.5 py-1 text-[0.68rem] font-semibold text-[#a8556b] hover:bg-[#fdf1f3] disabled:opacity-45"
                  >
                    {removingId === photo.id ? "Removing…" : "Remove"}
                  </button>
                  {photos.length > 1 ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => movePhoto(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move photo ${index + 1} up`}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#ece2f6] text-[0.72rem] font-semibold text-[#5b3f7d] disabled:opacity-35"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 1)}
                        disabled={index === photos.length - 1}
                        aria-label={`Move photo ${index + 1} down`}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#ece2f6] text-[0.72rem] font-semibold text-[#5b3f7d] disabled:opacity-35"
                      >
                        Dn
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      <div className="space-y-2">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]">
          Memory style
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["polaroid", "Polaroid"],
              ["scrapbook", "Scrapbook"],
              ["slideshow", "Slideshow"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onMemoryStyleChange(key)}
              aria-pressed={memoryStyle === key}
              className={cn(
                "rounded-xl border px-2 py-2 text-[0.72rem] font-semibold transition",
                memoryStyle === key
                  ? "border-[#8a5bc4] bg-[#f6f0ff] text-[#5b3f7d]"
                  : "border-[#ece2f6] bg-white text-[#8a7a9c]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {busy ? (
        <motion.div
          className="h-1 rounded-full bg-[#e7dcf7]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full rounded-full bg-[#8a5bc4]"
            animate={{ width: ["10%", "85%", "95%"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
