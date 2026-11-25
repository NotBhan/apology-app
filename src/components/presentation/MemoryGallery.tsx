"use client";

import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PhotoAsset } from "@/types/apology";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icons";
import { OptimizedPhoto } from "@/components/ui/OptimizedPhoto";

interface MemoryGalleryProps {
  photos: PhotoAsset[];
  style: "polaroid" | "scrapbook" | "slideshow";
  className?: string;
  animate?: boolean;
  onSeenAll?: () => void;
}

export function MemoryGallery({
  photos,
  style,
  className,
  animate = true,
  onSeenAll,
}: MemoryGalleryProps) {
  if (photos.length === 0) return null;
  if (style === "slideshow") {
    return <Slideshow photos={photos} className={className} animate={animate} />;
  }
  if (style === "scrapbook") {
    return (
      <Scrapbook photos={photos} className={className} animate={animate} onSeenAll={onSeenAll} />
    );
  }
  return <Polaroids photos={photos} className={className} animate={animate} onSeenAll={onSeenAll} />;
}

function Photo({
  photo,
  className,
  priority,
}: {
  photo: PhotoAsset;
  className?: string;
  priority?: boolean;
}) {
  return (
    <OptimizedPhoto
      src={photo.url}
      alt={photo.caption?.trim() || "A memory"}
      width={photo.width}
      height={photo.height}
      focalPoint={photo.focalPoint ?? "50% 50%"}
      priority={priority}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

function Polaroids({
  photos,
  className,
  animate,
  onSeenAll,
}: {
  photos: PhotoAsset[];
  className?: string;
  animate: boolean;
  onSeenAll?: () => void;
}) {
  const reduce = useReducedMotion();
  const still = reduce || !animate;

  return (
    <div
      className={cn(
        "no-scrollbar flex snap-y snap-mandatory flex-col items-center gap-5 overflow-y-auto px-4 py-2",
        className,
      )}
      onScroll={(event) => {
        const el = event.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) onSeenAll?.();
      }}
    >
      {photos.map((photo, index) => (
        <motion.figure
          key={photo.id}
          initial={still ? false : { opacity: 0, y: 26, rotate: index % 2 ? 1.6 : -1.6 }}
          whileInView={still ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 }}
          className="w-full max-w-[290px] shrink-0 snap-center bg-white p-2.5 pb-9 shadow-[0_16px_36px_-18px_rgba(0,0,0,0.45)]"
          style={{ rotate: `${index % 2 ? 1.4 : -1.4}deg` }}
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-[#eee]">
            <Photo photo={photo} priority={index === 0} />
          </div>
          {photo.caption?.trim() ? (
            <figcaption
              className="mt-2.5 truncate text-center text-[0.8rem] text-[#4a3b52]"
              style={{ fontFamily: "var(--t-font-deco)" }}
            >
              {photo.caption}
            </figcaption>
          ) : null}
        </motion.figure>
      ))}
    </div>
  );
}

function Scrapbook({
  photos,
  className,
  animate,
  onSeenAll,
}: {
  photos: PhotoAsset[];
  className?: string;
  animate: boolean;
  onSeenAll?: () => void;
}) {
  const reduce = useReducedMotion();
  const still = reduce || !animate;
  const rotations = [-4, 3, -2, 5, -3];

  return (
    <div
      className={cn("relative grid grid-cols-2 gap-3 px-3", className)}
    >
      {photos.map((photo, index) => (
        <motion.figure
          key={photo.id}
          initial={still ? false : { opacity: 0, scale: 0.9, y: 18 }}
          animate={still ? undefined : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={index === photos.length - 1 ? onSeenAll : undefined}
          className={cn(
            "relative bg-white p-1.5 shadow-[0_12px_26px_-14px_rgba(0,0,0,0.5)]",
            index === 0 && photos.length % 2 === 1 ? "col-span-2 mx-auto w-[70%]" : "",
          )}
          style={{ rotate: `${rotations[index % rotations.length]}deg` }}
        >
          <span
            aria-hidden
            className="absolute -top-2 left-1/2 z-10 h-4 w-12 -translate-x-1/2 opacity-80"
            style={{
              background: "linear-gradient(180deg, #f7e7a8, #efd87e)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
              rotate: `${index % 2 ? 3 : -3}deg`,
            }}
          />
          <div className="relative aspect-square overflow-hidden bg-[#eee]">
            <Photo photo={photo} priority={index === 0} />
          </div>
          {photo.caption?.trim() ? (
            <figcaption
              className="mt-1.5 truncate text-center text-[0.72rem] text-[#4a3b52]"
              style={{ fontFamily: "var(--t-font-deco)" }}
            >
              {photo.caption}
            </figcaption>
          ) : null}
        </motion.figure>
      ))}
    </div>
  );
}

function Slideshow({
  photos,
  className,
  animate,
}: {
  photos: PhotoAsset[];
  className?: string;
  animate: boolean;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(() => new Set([0]));
  const still = reduce || !animate;

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => {
        const nextIdx = (current + delta + photos.length) % photos.length;
        setVisitedIndices((prev) => {
          if (prev.has(nextIdx)) return prev;
          const next = new Set(prev);
          next.add(nextIdx);
          return next;
        });
        return nextIdx;
      });
    },
    [photos.length],
  );

  const safeIndex = Math.min(index, Math.max(0, photos.length - 1));
  const photo = photos[safeIndex];
  if (!photo) return null;

  return (
    <div className={cn("flex w-full flex-col items-center gap-4", className)}>
      <div className="relative w-full max-w-[320px] overflow-hidden rounded-2xl bg-black/5 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.6)]">
        <div className="relative aspect-[4/5]">
          {photos.map((slidePhoto, slideIdx) => {
            if (!visitedIndices.has(slideIdx) && slideIdx !== safeIndex) return null;
            const isActive = slideIdx === safeIndex;
            return (
              <motion.div
                key={slidePhoto.id}
                aria-hidden={!isActive}
                className={cn(
                  "absolute inset-0",
                  isActive ? "z-10" : "z-0 pointer-events-none",
                )}
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  scale: still ? 1 : isActive ? 1 : 0.98,
                }}
                transition={{ duration: still ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Photo photo={slidePhoto} priority={slideIdx === 0 || isActive} />
              </motion.div>
            );
          })}
        </div>
      </div>

      {photo.caption?.trim() ? (
        <p
          className="min-h-[1.5em] text-center text-sm"
          style={{ fontFamily: "var(--t-font-deco)", color: "var(--t-primary)" }}
        >
          {photo.caption}
        </p>
      ) : null}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous photo"
          className="grid h-9 w-9 place-items-center rounded-full border text-sm"
          style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
        >
          <Icon name="chevron-left" size={14} />
        </button>
        <div className="flex gap-1.5" aria-hidden>
          {photos.map((item, dot) => (
            <span
              key={item.id}
              className="h-1.5 w-1.5 rounded-full transition-opacity"
              style={{
                background: "var(--t-primary)",
                opacity: dot === safeIndex ? 1 : 0.25,
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next photo"
          className="grid h-9 w-9 place-items-center rounded-full border text-sm"
          style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
        >
          <Icon name="chevron-right" size={14} />
        </button>
      </div>
    </div>
  );
}
