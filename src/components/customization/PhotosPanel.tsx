"use client";

import { useRef, useState } from "react";
import { motion, Reorder } from "framer-motion";
import type { PhotoAsset } from "@/types/apology";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/cn";

interface PhotosPanelProps {
  photos: PhotoAsset[];
  memoryStyle: "polaroid" | "scrapbook" | "slideshow";
  onChange: (photos: PhotoAsset[]) => void;
  onMemoryStyleChange: (style: "polaroid" | "scrapbook" | "slideshow") => void;
  onUpload: (blob: Blob, meta: { width: number; height: number; type: string }) => Promise<PhotoAsset>;
}

const MAX_PHOTOS = 5;

export function PhotosPanel({
  photos,
  memoryStyle,
  onChange,
  onMemoryStyleChange,
  onUpload,
}: PhotosPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    try {
      const slots = MAX_PHOTOS - photos.length;
      const chosen = Array.from(files).slice(0, Math.max(0, slots));
      const uploaded: PhotoAsset[] = [];
      for (const file of chosen) {
        const compressed = await compressImage(file);
        const asset = await onUpload(compressed.blob, {
          width: compressed.width,
          height: compressed.height,
          type: compressed.type,
        });
        uploaded.push(asset);
      }
      onChange([...photos, ...uploaded]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function update(id: string, patch: Partial<PhotoAsset>) {
    onChange(photos.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)));
  }

  function remove(id: string) {
    onChange(photos.filter((photo) => photo.id !== id));
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
          {busy ? "Uploading…" : "Add photos"}
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

      {error ? <p className="text-[0.75rem] text-[#b91c1c]">{error}</p> : null}

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: photo.focalPoint ?? "50% 50%" }}
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

                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.62rem] uppercase tracking-[0.12em] text-[#a394b4]">
                      focus
                    </span>
                    {["20% 20%", "50% 20%", "80% 20%", "50% 50%", "50% 80%"].map((focal) => (
                      <button
                        key={focal}
                        type="button"
                        onClick={() => update(photo.id, { focalPoint: focal })}
                        aria-label={`Set focus ${focal}`}
                        aria-pressed={(photo.focalPoint ?? "50% 50%") === focal}
                        className={cn(
                          "h-4 w-4 rounded-full border transition",
                          (photo.focalPoint ?? "50% 50%") === focal
                            ? "border-[#6d3fa8] bg-[#6d3fa8]/70"
                            : "border-[#d8c9e8] bg-white",
                        )}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => remove(photo.id)}
                  className="self-start rounded-full px-2 py-1 text-[0.68rem] text-[#a8556b] hover:bg-[#fdf1f3]"
                >
                  Remove
                </button>
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
