"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { MissYouTheme } from "@/experiences/miss-you/themes";
import {
  normalizeMissYouPhotos,
  type MissYouPhotoItem,
  type MissYouPhotoLayout,
  type NormalizedMissYouPhoto,
} from "@/experiences/miss-you/schema";
import { Icon } from "@/components/ui/icons";
import { OptimizedPhoto } from "@/components/ui/OptimizedPhoto";
import { cn } from "@/lib/cn";

export interface MissYouPhotoGalleryProps {
  photos: MissYouPhotoItem[];
  layout?: MissYouPhotoLayout;
  theme: MissYouTheme;
  animate?: boolean;
  className?: string;
}

export function MissYouPhotoGallery({
  photos,
  layout = "postcards",
  theme,
  animate = true,
  className = "",
}: MissYouPhotoGalleryProps) {
  const normalized = normalizeMissYouPhotos(photos);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const openLightbox = useCallback((idx: number, e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) triggerRef.current = e.currentTarget;
    setActiveLightboxIndex(idx);
  }, []);

  const closeLightbox = useCallback(() => {
    setActiveLightboxIndex(null);
    triggerRef.current?.focus();
  }, []);

  if (normalized.length === 0) {
    return (
      <div className={cn("text-center py-4 px-4", className)}>
        <p className="text-sm opacity-75" style={{ color: theme.palette.mutedText }}>
          No photographs attached yet — just these words for now.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="miss-you-photo-gallery"
      data-layout={layout}
      className={cn("relative w-full max-w-[480px] mx-auto", className)}
    >
      {layout === "carousel" ? (
        <CarouselLayout
          photos={normalized}
          theme={theme}
          animate={animate}
          onPhotoClick={openLightbox}
        />
      ) : layout === "strips" ? (
        <FilmstripLayout
          photos={normalized}
          theme={theme}
          animate={animate}
          onPhotoClick={openLightbox}
        />
      ) : layout === "polaroid" ? (
        <PolaroidLayout
          photos={normalized}
          theme={theme}
          animate={animate}
          onPhotoClick={openLightbox}
        />
      ) : (
        <PostcardsLayout
          photos={normalized}
          theme={theme}
          animate={animate}
          onPhotoClick={openLightbox}
        />
      )}

      {activeLightboxIndex !== null && (
        <LightboxModal
          photos={normalized}
          currentIndex={activeLightboxIndex}
          theme={theme}
          onClose={closeLightbox}
          onNavigate={setActiveLightboxIndex}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Keepsake Postcards Layout                                               */
/* -------------------------------------------------------------------------- */
function PostcardsLayout({
  photos,
  theme,
  animate,
  onPhotoClick,
}: {
  photos: NormalizedMissYouPhoto[];
  theme: MissYouTheme;
  animate: boolean;
  onPhotoClick: (idx: number, e?: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const reduce = useReducedMotion();
  const still = reduce || !animate;
  const rotations = [-1.6, 1.8, -1.2, 2, -1.4];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 px-1">
      {photos.map((photo, idx) => {
        const isHero = idx === 0 && photos.length % 2 === 1;
        return (
          <motion.figure
            key={photo.id}
            initial={still ? false : { opacity: 0, y: 14, scale: 0.96 }}
            animate={still ? undefined : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: idx * 0.07 }}
            className={cn(
              "relative rounded-2xl p-2 shadow-md group cursor-pointer",
              isHero ? "sm:col-span-2 sm:max-w-[300px] sm:mx-auto w-full" : "w-full",
            )}
            style={{
              background: theme.palette.surface,
              border: `1.5px solid ${theme.palette.border}`,
              rotate: `${rotations[idx % rotations.length]}deg`,
            }}
          >
            {/* Corner stamp tag */}
            <span
              aria-hidden="true"
              className="absolute top-2 right-2 z-10 rounded border border-dashed px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
              style={{
                background: theme.palette.surfaceAlt,
                borderColor: theme.palette.primary,
                color: theme.palette.primary,
              }}
            >
              0{idx + 1}
            </span>

            <button
              type="button"
              onClick={(e) => onPhotoClick(idx, e)}
              aria-label={`View photo ${idx + 1}: ${photo.caption || "Postcard"} in full screen`}
              className="w-full text-left focus:outline-none focus:ring-2 rounded-xl"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-stone-200/40">
                <OptimizedPhoto
                  src={photo.url}
                  alt={photo.caption || `Postcard ${idx + 1}`}
                  focalPoint={photo.focalPoint || "50% 50%"}
                  width={photo.width}
                  height={photo.height}
                  priority={idx === 0}
                  className="object-cover transition-transform duration-300 group-hover:scale-103"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="rounded-full bg-black/60 p-1.5 text-white shadow-md">
                    <Icon name="eye" size={14} />
                  </span>
                </div>
              </div>
              {photo.caption ? (
                <figcaption
                  className="mt-2 truncate px-1 text-center text-sm"
                  style={{
                    fontFamily: theme.typography.decoFont,
                    color: theme.palette.text,
                  }}
                >
                  {photo.caption}
                </figcaption>
              ) : null}
            </button>
          </motion.figure>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Tucked Polaroids Layout                                                 */
/* -------------------------------------------------------------------------- */
function PolaroidLayout({
  photos,
  theme,
  animate,
  onPhotoClick,
}: {
  photos: NormalizedMissYouPhoto[];
  theme: MissYouTheme;
  animate: boolean;
  onPhotoClick: (idx: number, e?: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const reduce = useReducedMotion();
  const still = reduce || !animate;

  return (
    <div className="flex flex-col items-center gap-4 px-2">
      {photos.map((photo, index) => (
        <motion.figure
          key={photo.id}
          initial={still ? false : { opacity: 0, y: 18 }}
          whileInView={still ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
          className="relative w-full max-w-[290px] bg-white p-3 pb-6 rounded-sm shadow-lg border border-stone-200/80 group cursor-pointer"
          style={{ rotate: `${index % 2 ? 1.5 : -1.5}deg` }}
        >
          {/* Decorative masking tape */}
          <span
            aria-hidden="true"
            className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 h-3.5 w-12 opacity-80 shadow-xs"
            style={{
              background: theme.palette.accent,
              rotate: `${index % 2 ? -2 : 2}deg`,
            }}
          />

          <button
            type="button"
            onClick={(e) => onPhotoClick(index, e)}
            aria-label={`View photo ${index + 1}: ${photo.caption || "Polaroid snapshot"} in full screen`}
            className="w-full text-left focus:outline-none focus:ring-2 rounded"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
              <OptimizedPhoto
                src={photo.url}
                alt={photo.caption || `Polaroid snapshot ${index + 1}`}
                focalPoint={photo.focalPoint || "50% 50%"}
                width={photo.width}
                height={photo.height}
                priority={index === 0}
                className="object-cover transition-transform duration-300 group-hover:scale-103"
              />
            </div>
            {photo.caption ? (
              <figcaption
                className="mt-2.5 truncate text-center text-sm text-stone-700"
                style={{ fontFamily: theme.typography.decoFont }}
              >
                {photo.caption}
              </figcaption>
            ) : null}
          </button>
        </motion.figure>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Memory Filmstrip Layout                                                 */
/* -------------------------------------------------------------------------- */
function FilmstripLayout({
  photos,
  theme,
  animate,
  onPhotoClick,
}: {
  photos: NormalizedMissYouPhoto[];
  theme: MissYouTheme;
  animate: boolean;
  onPhotoClick: (idx: number, e?: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const reduce = useReducedMotion();
  const still = reduce || !animate;

  return (
    <div
      className="mx-auto w-full max-w-[330px] rounded-2xl p-2.5 sm:p-3 shadow-xl"
      style={{
        background: theme.isDark ? "#10141c" : "#221e24",
        border: `1.5px solid ${theme.palette.border}`,
      }}
    >
      <div className="space-y-3">
        {photos.map((photo, index) => (
          <motion.figure
            key={photo.id}
            initial={still ? false : { opacity: 0, y: 12 }}
            whileInView={still ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.45, delay: index * 0.06 }}
            className="space-y-1.5"
          >
            {/* Sprocket perforation rail */}
            <div className="flex items-center justify-between px-1 text-[9px] font-mono tracking-widest text-white/50">
              <span>FRAME {String(index + 1).padStart(2, "0")}</span>
              <span>KOI·35MM</span>
            </div>
            <button
              type="button"
              onClick={(e) => onPhotoClick(index, e)}
              aria-label={`View photo ${index + 1}: ${photo.caption || "Filmstrip frame"} in full screen`}
              className="group relative block w-full overflow-hidden rounded-lg border border-white/15 focus:outline-none focus:ring-2"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-900">
                <OptimizedPhoto
                  src={photo.url}
                  alt={photo.caption || `Filmstrip frame ${index + 1}`}
                  focalPoint={photo.focalPoint || "50% 50%"}
                  width={photo.width}
                  height={photo.height}
                  priority={index === 0}
                  className="object-cover transition-transform duration-300 group-hover:scale-103"
                  placeholderClassName="bg-stone-800"
                />
              </div>
            </button>
            {photo.caption ? (
              <figcaption
                className="px-1 text-center text-xs text-white/85 truncate"
                style={{ fontFamily: theme.typography.decoFont }}
              >
                {photo.caption}
              </figcaption>
            ) : null}
          </motion.figure>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Window Carousel Layout (persistent DOM slides, zero re-downloads)       */
/* -------------------------------------------------------------------------- */
function CarouselLayout({
  photos,
  theme,
  animate,
  onPhotoClick,
}: {
  photos: NormalizedMissYouPhoto[];
  theme: MissYouTheme;
  animate: boolean;
  onPhotoClick: (idx: number, e?: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(() => new Set([0]));
  const still = reduce || !animate;

  const markVisited = useCallback((target: number) => {
    setVisitedIndices((prev) => {
      if (prev.has(target)) return prev;
      const next = new Set(prev);
      next.add(target);
      return next;
    });
  }, []);

  const go = useCallback(
    (delta: number) => {
      if (photos.length === 0) return;
      setIndex((current) => {
        const base = Math.min(current, photos.length - 1);
        const nextIdx = (base + delta + photos.length) % photos.length;
        markVisited(nextIdx);
        return nextIdx;
      });
    },
    [markVisited, photos.length],
  );

  const safeIndex = Math.min(index, Math.max(0, photos.length - 1));
  const currentPhoto = photos[safeIndex];
  if (!currentPhoto) return null;

  return (
    <div className="flex w-full flex-col items-center gap-2.5 px-2">
      <div
        className="relative w-full max-w-[340px] overflow-hidden rounded-2xl p-2.5 shadow-lg group"
        style={{
          background: theme.palette.surface,
          border: `1.5px solid ${theme.palette.border}`,
        }}
      >
        <button
          type="button"
          onClick={(e) => onPhotoClick(safeIndex, e)}
          aria-label={`View photo ${safeIndex + 1}: ${currentPhoto.caption || "Carousel photograph"} in full screen`}
          className="w-full text-left focus:outline-none focus:ring-2 rounded-xl cursor-pointer"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-stone-200/40">
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
                  <OptimizedPhoto
                    src={slidePhoto.url}
                    alt={slidePhoto.caption || `Carousel photograph ${slideIdx + 1}`}
                    focalPoint={slidePhoto.focalPoint || "50% 50%"}
                    width={slidePhoto.width}
                    height={slidePhoto.height}
                    priority={slideIdx === 0 || isActive}
                    className="object-cover"
                  />
                </motion.div>
              );
            })}
            <div className="absolute inset-0 z-20 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="rounded-full bg-black/60 p-2 text-white shadow-md">
                <Icon name="eye" size={16} />
              </span>
            </div>
          </div>
        </button>
      </div>

      {currentPhoto.caption ? (
        <p
          className="min-h-[1.5em] text-center text-base px-4 truncate max-w-[340px]"
          style={{
            fontFamily: theme.typography.decoFont,
            color: theme.palette.primary,
          }}
        >
          {currentPhoto.caption}
        </p>
      ) : null}

      {photos.length > 1 ? (
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="grid h-9 w-9 place-items-center rounded-full border shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              borderColor: theme.palette.border,
              background: theme.palette.surface,
              color: theme.palette.text,
            }}
          >
            <Icon name="chevron-left" size={15} />
          </button>

          <div className="flex gap-1.5">
            {photos.map((item, dot) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  markVisited(dot);
                  setIndex(dot);
                }}
                aria-label={`Jump to photo ${dot + 1}`}
                className="h-2 w-2 rounded-full transition-all cursor-pointer"
                style={{
                  background: theme.palette.primary,
                  opacity: dot === safeIndex ? 1 : 0.25,
                  transform: dot === safeIndex ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="grid h-9 w-9 place-items-center rounded-full border shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              borderColor: theme.palette.border,
              background: theme.palette.surface,
              color: theme.palette.text,
            }}
          >
            <Icon name="chevron-right" size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Accessible Full-Screen Lightbox Modal                                   */
/* -------------------------------------------------------------------------- */
function LightboxModal({
  photos,
  currentIndex,
  theme,
  onClose,
  onNavigate,
}: {
  photos: NormalizedMissYouPhoto[];
  currentIndex: number;
  theme: MissYouTheme;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const safeCurrent = Math.min(currentIndex, Math.max(0, photos.length - 1));
  const currentPhoto = photos[safeCurrent];
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" && photos.length > 1) {
        e.preventDefault();
        onNavigate((safeCurrent - 1 + photos.length) % photos.length);
      } else if (e.key === "ArrowRight" && photos.length > 1) {
        e.preventDefault();
        onNavigate((safeCurrent + 1) % photos.length);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safeCurrent, onClose, onNavigate, photos.length]);

  if (!currentPhoto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-full max-w-full flex-col items-center">
        <div className="flex w-full items-center justify-between pb-3 text-white/90">
          <span className="text-xs font-medium tracking-wider uppercase opacity-80">
            Photo {safeCurrent + 1} of {photos.length}
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close photo preview"
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => onNavigate((safeCurrent - 1 + photos.length) % photos.length)}
              aria-label="Previous photo"
              className="absolute left-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm hover:bg-black/80 transition cursor-pointer"
            >
              <Icon name="chevron-left" size={20} />
            </button>
          )}

          <div className="relative h-[72vh] w-[min(88vw,780px)] overflow-hidden rounded-xl shadow-2xl">
            <OptimizedPhoto
              src={currentPhoto.url}
              alt={currentPhoto.caption || `Shared photo ${safeCurrent + 1}`}
              priority
              className="object-contain"
              placeholderClassName="bg-stone-800"
            />
          </div>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => onNavigate((safeCurrent + 1) % photos.length)}
              aria-label="Next photo"
              className="absolute right-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm hover:bg-black/80 transition cursor-pointer"
            >
              <Icon name="chevron-right" size={20} />
            </button>
          )}
        </div>

        {currentPhoto.caption ? (
          <div className="mt-3 max-w-[500px] text-center px-4">
            <p
              className="text-base text-white/95 leading-relaxed"
              style={{ fontFamily: theme.typography.decoFont }}
            >
              {currentPhoto.caption}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
