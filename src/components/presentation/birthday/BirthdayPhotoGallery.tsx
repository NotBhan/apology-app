"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useMounted";
import type { BirthdayTheme } from "@/experiences/birthday/themes";
import {
  normalizeBirthdayPhotos,
  type BirthdayPhotoItem,
  type BirthdayPhotoLayout,
  type NormalizedBirthdayPhoto,
} from "@/experiences/birthday/schema";
import { Icon } from "@/components/ui/icons";
import { OptimizedPhoto } from "@/components/ui/OptimizedPhoto";
import { cn } from "@/lib/cn";

export interface BirthdayPhotoGalleryProps {
  photos: BirthdayPhotoItem[];
  layout?: BirthdayPhotoLayout;
  theme: BirthdayTheme;
  animate?: boolean;
  className?: string;
}

export function BirthdayPhotoGallery({
  photos,
  layout = "theme-adaptive",
  theme,
  animate = true,
  className = "",
}: BirthdayPhotoGalleryProps) {
  const normalized = normalizeBirthdayPhotos(photos);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const openLightbox = useCallback((idx: number, e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) triggerRef.current = e.currentTarget;
    setActiveLightboxIndex(idx);
  }, []);

  const closeLightbox = useCallback(() => {
    setActiveLightboxIndex(null);
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  }, []);

  if (normalized.length === 0) {
    return (
      <div className={cn("text-center py-6 px-4", className)}>
        <p className="text-sm opacity-70" style={{ color: theme.palette.mutedText }}>
          No photos this time — the words are the gift.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="birthday-photo-gallery"
      data-layout={layout}
      className={cn("relative w-full max-w-[480px] mx-auto", className)}
    >
      {layout === "slideshow" ? (
        <SlideshowLayout
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
      ) : layout === "scrapbook" ? (
        <ScrapbookLayout
          photos={normalized}
          theme={theme}
          animate={animate}
          onPhotoClick={openLightbox}
        />
      ) : (
        <ThemeAdaptiveLayout
          photos={normalized}
          theme={theme}
          animate={animate}
          onPhotoClick={openLightbox}
        />
      )}

      {/* Accessible Full-Screen Lightbox Modal */}
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

// ---------------------------------------------------------------------------
// 1. Theme-Adaptive Presentation Layout
// ---------------------------------------------------------------------------
function ThemeAdaptiveLayout({
  photos,
  theme,
  animate,
  onPhotoClick,
}: {
  photos: NormalizedBirthdayPhoto[];
  theme: BirthdayTheme;
  animate: boolean;
  onPhotoClick: (idx: number, e?: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const reduce = useReducedMotionSafe();
  const still = reduce || !animate;
  const themeFamily = theme.decorations.family;

  // Specific style overrides per birthday theme
  const getThemePhotoStyles = (idx: number) => {
    switch (themeFamily) {
      case "midnight-gold":
        return {
          wrapper: "border border-[#e5b869]/40 bg-[#1c1714] shadow-[0_16px_36px_-12px_rgba(0,0,0,0.85)]",
          innerFrame: "p-2 border border-[#e5b869]/20 rounded-xl",
          caption: "text-[#ffd166] font-serif text-[0.8rem] tracking-wide",
          pin: (
            <div
              aria-hidden
              className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-[#e5b869] text-[#1c1714] shadow-md"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
              </svg>
            </div>
          ),
          rotation: idx % 2 === 0 ? -1 : 1,
        };

      case "pastel":
        return {
          wrapper: "border border-[#f8d7da] bg-white shadow-[0_14px_30px_-10px_rgba(230,73,128,0.15)] rounded-2xl",
          innerFrame: "p-2",
          caption: "text-[#9c7bc2] text-[0.8rem] italic",
          pin: (
            <div
              aria-hidden
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 h-3.5 w-14 rounded-full opacity-85 shadow-sm"
              style={{
                background: idx % 2 === 0 ? "#fbcfe8" : "#e9d5ff",
                transform: `translateX(-50%) rotate(${idx % 2 === 0 ? 2 : -2}deg)`,
              }}
            />
          ),
          rotation: idx % 2 === 0 ? -1.8 : 1.8,
        };

      case "floral":
        return {
          wrapper: "border border-[#d8e2dc] bg-[#fbf9f5] shadow-[0_12px_28px_-10px_rgba(82,121,111,0.2)] rounded-xl",
          innerFrame: "p-2.5",
          caption: "text-[#52796f] text-[0.8rem] font-serif",
          pin: (
            <div
              aria-hidden
              className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 h-3.5 w-12 rounded-sm shadow-sm opacity-80"
              style={{
                background: "linear-gradient(135deg, #84a98c, #52796f)",
                transform: `translateX(-50%) rotate(${idx % 2 === 0 ? -3 : 3}deg)`,
              }}
            />
          ),
          rotation: idx % 2 === 0 ? -1.5 : 1.5,
        };

      case "vintage":
        return {
          wrapper: "border border-[#e6ccb2] bg-[#fdfbf7] shadow-[0_14px_32px_-12px_rgba(127,85,57,0.25)] rounded-lg",
          innerFrame: "p-2.5 relative",
          caption: "text-[#7f5539] text-[0.78rem] tracking-wide uppercase font-mono",
          pin: (
            <div
              aria-hidden
              className="absolute top-1.5 right-1.5 z-10 rounded border border-[#ddb892] px-1 py-0.5 text-[8px] font-bold text-[#9c6644] opacity-75"
            >
              AIRMAIL
            </div>
          ),
          rotation: idx % 2 === 0 ? -2 : 2,
        };

      case "playful":
        return {
          wrapper: "border-2 border-[#ff922b] bg-white shadow-[0_14px_30px_-10px_rgba(255,146,43,0.3)] rounded-2xl",
          innerFrame: "p-2",
          caption: "text-[#f06595] text-[0.82rem] font-bold",
          pin: (
            <div
              aria-hidden
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 h-4 w-12 rounded-sm opacity-90 shadow-sm"
              style={{
                background: "repeating-linear-gradient(45deg, #ff922b, #ff922b 4px, #fcc419 4px, #fcc419 8px)",
                transform: `translateX(-50%) rotate(${idx % 2 === 0 ? 3 : -3}deg)`,
              }}
            />
          ),
          rotation: idx % 2 === 0 ? -3 : 3,
        };

      case "confetti":
      default:
        return {
          wrapper: "border border-[#f3e5d0] bg-white shadow-[0_14px_32px_-12px_rgba(232,89,12,0.22)] rounded-2xl",
          innerFrame: "p-2",
          caption: "text-[#e8590c] text-[0.8rem] font-medium",
          pin: (
            <div
              aria-hidden
              className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 h-3.5 w-12 rounded-sm opacity-85 shadow-sm"
              style={{
                background: idx % 2 === 0 ? "linear-gradient(135deg, #e8590c, #f59f00)" : "linear-gradient(135deg, #f06595, #ff922b)",
                transform: `translateX(-50%) rotate(${idx % 2 === 0 ? -2.5 : 2.5}deg)`,
              }}
            />
          ),
          rotation: idx % 2 === 0 ? -2 : 2,
        };
    }
  };

  // Scaling configurations based on photo count:
  // 1 photo: Grand hero centered
  if (photos.length === 1) {
    const photo = photos[0];
    const style = getThemePhotoStyles(0);
    return (
      <div className="w-full max-w-[340px] mx-auto px-2">
        <motion.div
          initial={still ? false : { opacity: 0, scale: 0.94, y: 16 }}
          animate={still ? undefined : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={cn("relative overflow-hidden cursor-pointer group", style.wrapper)}
          style={{ rotate: `${style.rotation * 0.5}deg` }}
        >
          {style.pin}
          <button
            type="button"
            onClick={(e) => onPhotoClick(0, e)}
            aria-label={`View photo: ${photo.caption || "Celebration photo"} in full screen`}
            className="w-full text-left focus:outline-none focus:ring-2 focus:ring-[#e8590c] rounded-xl"
          >
            <div className={style.innerFrame}>
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-stone-100">
                <OptimizedPhoto
                  src={photo.url}
                  alt={photo.caption || "Celebration memory"}
                  focalPoint={photo.focalPoint || "50% 50%"}
                  priority
                  className="object-cover transition-transform duration-300 group-hover:scale-103"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="rounded-full bg-black/60 p-2 text-white shadow-md">
                    <Icon name="eye" size={16} />
                  </span>
                </div>
              </div>
              {photo.caption ? (
                <p className={cn("mt-2.5 text-center truncate px-1", style.caption)}>
                  {photo.caption}
                </p>
              ) : null}
            </div>
          </button>
        </motion.div>
      </div>
    );
  }

  // 2 photos: Diptych side-by-side (or stacked on narrow screens)
  if (photos.length === 2) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full px-2">
        {photos.map((photo, idx) => {
          const style = getThemePhotoStyles(idx);
          return (
            <motion.div
              key={photo.id}
              initial={still ? false : { opacity: 0, scale: 0.92, y: 16 }}
              animate={still ? undefined : { opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={cn("relative overflow-hidden cursor-pointer group", style.wrapper)}
              style={{ rotate: `${style.rotation}deg` }}
            >
              {style.pin}
              <button
                type="button"
                onClick={(e) => onPhotoClick(idx, e)}
                aria-label={`View photo ${idx + 1}: ${photo.caption || "Celebration photo"} in full screen`}
                className="w-full text-left focus:outline-none focus:ring-2 focus:ring-[#e8590c] rounded-xl"
              >
                <div className={style.innerFrame}>
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-stone-100">
                    <OptimizedPhoto
                      src={photo.url}
                      alt={photo.caption || `Celebration memory ${idx + 1}`}
                      focalPoint={photo.focalPoint || "50% 50%"}
                      priority={idx === 0}
                      className="object-cover transition-transform duration-300 group-hover:scale-103"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="rounded-full bg-black/60 p-1.5 text-white shadow-md">
                        <Icon name="eye" size={14} />
                      </span>
                    </div>
                  </div>
                  {photo.caption ? (
                    <p className={cn("mt-2 text-center truncate px-1", style.caption)}>
                      {photo.caption}
                    </p>
                  ) : null}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // 3 to 5 photos: Featured hero layout with collage flow
  return (
    <div className="space-y-3.5 w-full px-2">
      {/* Odd count: First photo is featured center hero */}
      {photos.length % 2 === 1 && (
        <div className="w-[74%] sm:w-[66%] mx-auto">
          {(() => {
            const photo = photos[0];
            const style = getThemePhotoStyles(0);
            return (
              <motion.div
                initial={still ? false : { opacity: 0, scale: 0.94, y: 14 }}
                animate={still ? undefined : { opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={cn("relative overflow-hidden cursor-pointer group", style.wrapper)}
                style={{ rotate: `${style.rotation * 0.7}deg` }}
              >
                {style.pin}
                <button
                  type="button"
                  onClick={(e) => onPhotoClick(0, e)}
                  aria-label={`View photo 1: ${photo.caption || "Celebration photo"} in full screen`}
                  className="w-full text-left focus:outline-none focus:ring-2 focus:ring-[#e8590c] rounded-xl"
                >
                  <div className={style.innerFrame}>
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-stone-100">
                      <OptimizedPhoto
                        src={photo.url}
                        alt={photo.caption || "Celebration memory 1"}
                        focalPoint={photo.focalPoint || "50% 50%"}
                        priority
                        className="object-cover transition-transform duration-300 group-hover:scale-103"
                      />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="rounded-full bg-black/60 p-1.5 text-white shadow-md">
                          <Icon name="eye" size={14} />
                        </span>
                      </div>
                    </div>
                    {photo.caption ? (
                      <p className={cn("mt-2 text-center truncate px-1", style.caption)}>
                        {photo.caption}
                      </p>
                    ) : null}
                  </div>
                </button>
              </motion.div>
            );
          })()}
        </div>
      )}

      {/* Grid for the remaining photos */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {(photos.length % 2 === 1 ? photos.slice(1) : photos).map((photo, itemIdx) => {
          const actualIdx = photos.length % 2 === 1 ? itemIdx + 1 : itemIdx;
          const style = getThemePhotoStyles(actualIdx);
          return (
            <motion.div
              key={photo.id}
              initial={still ? false : { opacity: 0, scale: 0.92, y: 14 }}
              animate={still ? undefined : { opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, delay: actualIdx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={cn("relative overflow-hidden cursor-pointer group", style.wrapper)}
              style={{ rotate: `${style.rotation}deg` }}
            >
              {style.pin}
              <button
                type="button"
                onClick={(e) => onPhotoClick(actualIdx, e)}
                aria-label={`View photo ${actualIdx + 1}: ${photo.caption || "Celebration photo"} in full screen`}
                className="w-full text-left focus:outline-none focus:ring-2 focus:ring-[#e8590c] rounded-xl"
              >
                <div className={style.innerFrame}>
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-stone-100">
                    <OptimizedPhoto
                      src={photo.url}
                      alt={photo.caption || `Celebration memory ${actualIdx + 1}`}
                      focalPoint={photo.focalPoint || "50% 50%"}
                      priority={actualIdx === 0}
                      className="object-cover transition-transform duration-300 group-hover:scale-103"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="rounded-full bg-black/60 p-1.5 text-white shadow-md">
                        <Icon name="eye" size={14} />
                      </span>
                    </div>
                  </div>
                  {photo.caption ? (
                    <p className={cn("mt-1.5 text-center truncate px-1", style.caption)}>
                      {photo.caption}
                    </p>
                  ) : null}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Scrapbook Layout
// ---------------------------------------------------------------------------
function ScrapbookLayout({
  photos,
  theme,
  animate,
  onPhotoClick,
}: {
  photos: NormalizedBirthdayPhoto[];
  theme: BirthdayTheme;
  animate: boolean;
  onPhotoClick: (idx: number, e?: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const reduce = useReducedMotionSafe();
  const still = reduce || !animate;
  const rotations = [-3.5, 3, -2.5, 4, -3];

  return (
    <div className="relative grid grid-cols-2 gap-3.5 px-2">
      {photos.map((photo, index) => {
        const isSingleHero = index === 0 && photos.length % 2 === 1;
        return (
          <motion.figure
            key={photo.id}
            initial={still ? false : { opacity: 0, scale: 0.9, y: 18 }}
            animate={still ? undefined : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative bg-white p-2 rounded-xl shadow-[0_12px_28px_-14px_rgba(0,0,0,0.38)] border border-stone-200/90 group cursor-pointer",
              isSingleHero ? "col-span-2 mx-auto w-[72%] sm:w-[65%]" : "",
            )}
            style={{ rotate: `${rotations[index % rotations.length]}deg` }}
          >
            {/* Kraft Washi Tape strip on top */}
            <span
              aria-hidden
              className="absolute -top-2.5 left-1/2 z-10 h-4 w-14 -translate-x-1/2 opacity-85 shadow-sm"
              style={{
                background: "linear-gradient(180deg, #f7e7a8, #efd87e)",
                rotate: `${index % 2 ? 3 : -3}deg`,
              }}
            />

            <button
              type="button"
              onClick={(e) => onPhotoClick(index, e)}
              aria-label={`View photo ${index + 1}: ${photo.caption || "Scrapbook photo"} in full screen`}
              className="w-full text-left focus:outline-none focus:ring-2 focus:ring-[#e8590c] rounded-lg"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-100">
                <OptimizedPhoto
                  src={photo.url}
                  alt={photo.caption || `Scrapbook photo ${index + 1}`}
                  focalPoint={photo.focalPoint || "50% 50%"}
                  priority={index === 0}
                  className="object-cover transition-transform duration-300 group-hover:scale-103"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="rounded-full bg-black/60 p-1.5 text-white shadow-md">
                    <Icon name="eye" size={14} />
                  </span>
                </div>
              </div>
              {photo.caption ? (
                <figcaption
                  className="mt-2 truncate text-center text-[0.78rem]"
                  style={{
                    fontFamily: theme.typography.headingFont,
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

// ---------------------------------------------------------------------------
// 3. Polaroid Layout
// ---------------------------------------------------------------------------
function PolaroidLayout({
  photos,
  theme,
  animate,
  onPhotoClick,
}: {
  photos: NormalizedBirthdayPhoto[];
  theme: BirthdayTheme;
  animate: boolean;
  onPhotoClick: (idx: number, e?: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const reduce = useReducedMotionSafe();
  const still = reduce || !animate;

  return (
    <div className="flex flex-col items-center gap-4.5 px-3">
      {photos.map((photo, index) => (
        <motion.figure
          key={photo.id}
          initial={still ? false : { opacity: 0, y: 22, rotate: index % 2 ? 1.5 : -1.5 }}
          whileInView={still ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
          className="w-full max-w-[290px] shrink-0 bg-white p-3 pb-8 rounded-sm shadow-[0_16px_36px_-16px_rgba(0,0,0,0.35)] border border-stone-200/60 group cursor-pointer"
          style={{ rotate: `${index % 2 ? 1.4 : -1.4}deg` }}
        >
          <button
            type="button"
            onClick={(e) => onPhotoClick(index, e)}
            aria-label={`View photo ${index + 1}: ${photo.caption || "Polaroid photo"} in full screen`}
            className="w-full text-left focus:outline-none focus:ring-2 focus:ring-[#e8590c] rounded"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-stone-100 shadow-inner">
              <OptimizedPhoto
                src={photo.url}
                alt={photo.caption || `Polaroid memory ${index + 1}`}
                focalPoint={photo.focalPoint || "50% 50%"}
                priority={index === 0}
                className="object-cover transition-transform duration-300 group-hover:scale-103"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="rounded-full bg-black/60 p-1.5 text-white shadow-md">
                  <Icon name="eye" size={14} />
                </span>
              </div>
            </div>
            {photo.caption ? (
              <figcaption
                className="mt-3 truncate text-center text-[0.82rem] text-stone-700 font-medium"
                style={{ fontFamily: theme.typography.headingFont }}
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

// ---------------------------------------------------------------------------
// 4. Slideshow Layout
// ---------------------------------------------------------------------------
function SlideshowLayout({
  photos,
  theme,
  animate,
  onPhotoClick,
}: {
  photos: NormalizedBirthdayPhoto[];
  theme: BirthdayTheme;
  animate: boolean;
  onPhotoClick: (idx: number, e?: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const reduce = useReducedMotionSafe();
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
      setIndex((current) => {
        const nextIdx = (current + delta + photos.length) % photos.length;
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
    <div className="flex w-full flex-col items-center gap-3.5 px-2">
      <div
        className="relative w-full max-w-[340px] overflow-hidden rounded-2xl p-2.5 shadow-[0_16px_36px_-16px_rgba(0,0,0,0.35)] group cursor-pointer"
        style={{
          background: theme.palette.surface,
          border: `1.5px solid ${theme.palette.border}`,
        }}
      >
        <button
          type="button"
          onClick={(e) => onPhotoClick(safeIndex, e)}
          aria-label={`View photo ${safeIndex + 1}: ${currentPhoto.caption || "Slideshow photo"} in full screen`}
          className="w-full text-left focus:outline-none focus:ring-2 focus:ring-[#e8590c] rounded-xl"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-stone-100">
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
                    alt={slidePhoto.caption || `Slideshow memory ${slideIdx + 1}`}
                    focalPoint={slidePhoto.focalPoint || "50% 50%"}
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

      {/* Caption if provided */}
      {currentPhoto.caption ? (
        <p
          className="min-h-[1.5em] text-center text-sm font-medium px-4 truncate max-w-[340px]"
          style={{
            fontFamily: theme.typography.headingFont,
            color: theme.palette.primary,
          }}
        >
          {currentPhoto.caption}
        </p>
      ) : null}

      {/* Slideshow Controls & Dots */}
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

        <div role="tablist" aria-label="Choose photo" className="flex items-center gap-1.5">
          {photos.map((item, dot) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={dot === index}
              onClick={() => {
                markVisited(dot);
                setIndex(dot);
              }}
              aria-label={`Jump to photo ${dot + 1}`}
              className="grid h-8 w-6 place-items-center cursor-pointer focus:outline-none focus-visible:ring-2 rounded-full"
              style={{ ["--tw-ring-color" as string]: theme.palette.primary }}
            >
              <span
                aria-hidden="true"
                className="block h-2 w-2 rounded-full transition-all"
                style={{
                  background: theme.palette.primary,
                  opacity: dot === index ? 1 : 0.25,
                  transform: dot === index ? "scale(1.2)" : "scale(1)",
                }}
              />
            </button>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Accessible Full-Screen Lightbox Modal
// ---------------------------------------------------------------------------
function LightboxModal({
  photos,
  currentIndex,
  theme,
  onClose,
  onNavigate,
}: {
  photos: NormalizedBirthdayPhoto[];
  currentIndex: number;
  theme: BirthdayTheme;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const safeCurrent = Math.min(currentIndex, Math.max(0, photos.length - 1));
  const currentPhoto = photos[safeCurrent];
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowLeft" && photos.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        onNavigate((safeCurrent - 1 + photos.length) % photos.length);
      } else if (e.key === "ArrowRight" && photos.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        onNavigate((safeCurrent + 1) % photos.length);
      } else if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safeCurrent, onClose, onNavigate, photos.length]);

  if (!currentPhoto) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-full max-w-full flex-col items-center">
        {/* Top Bar: Counter & Close */}
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

        {/* Center: Image Display with Previous / Next Arrows */}
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

          <div className="h-[72vh] w-[min(88vw,780px)] overflow-hidden rounded-xl shadow-2xl">
            <OptimizedPhoto
              src={currentPhoto.url}
              alt={currentPhoto.caption || `Celebration photo ${safeCurrent + 1}`}
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

        {/* Bottom Caption */}
        {currentPhoto.caption ? (
          <div className="mt-3 max-w-[500px] text-center px-4">
            <p
              className="text-sm text-white/95 leading-relaxed font-medium"
              style={{ fontFamily: theme.typography.headingFont }}
            >
              {currentPhoto.caption}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
