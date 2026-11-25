"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icons";

export interface OptimizedPhotoProps {
  src: string;
  alt: string;
  /** Prioritize loading when the photograph is the first visible / hero frame. */
  priority?: boolean;
  focalPoint?: string;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  containerClassName?: string;
  style?: CSSProperties;
  draggable?: boolean;
  /** Optional surface tint for shimmer placeholder before decode completes. */
  placeholderClassName?: string;
  fallbackLabel?: string;
  /** Render icon-only error fallback when placed inside compact square thumbnails. */
  compactFallback?: boolean;
}

/**
 * Progressive, CLS-safe photograph renderer.
 *
 * - Sets explicit eager vs lazy loading and fetchPriority hints.
 * - Uses asynchronous decoding so off-thread image decode stays smooth.
 * - Displays an immediate check for cached images, a soft pulse skeleton while
 *   loading, and an accessible fallback placeholder on error.
 */
export function OptimizedPhoto({
  src,
  alt,
  priority = false,
  focalPoint,
  width,
  height,
  className,
  containerClassName,
  style,
  draggable = false,
  placeholderClassName,
  fallbackLabel = "Photo unavailable",
  compactFallback = false,
}: OptimizedPhotoProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const trimmedSrc = src.trim();
  const loaded = Boolean(trimmedSrc) && loadedSrc === trimmedSrc;
  const failed = !trimmedSrc || failedSrc === trimmedSrc;

  useEffect(() => {
    const img = imgRef.current;
    if (trimmedSrc && img && img.complete && img.naturalWidth > 0) {
      setLoadedSrc(trimmedSrc);
    }
  }, [trimmedSrc]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackLabel}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-1.5 bg-stone-100/90 text-center text-stone-500",
          compactFallback ? "p-1" : "p-3",
          containerClassName,
        )}
      >
        <Icon name="image" size={compactFallback ? 15 : 18} />
        {!compactFallback && (
          <span className="text-[11px] font-medium leading-tight opacity-80">{fallbackLabel}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden", containerClassName)}>
      {!loaded && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 animate-pulse bg-stone-200/70",
            placeholderClassName,
          )}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={trimmedSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={draggable}
        onLoad={() => setLoadedSrc(trimmedSrc)}
        onError={() => setFailedSrc(trimmedSrc)}
        className={cn(
          "h-full w-full transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        style={{
          objectPosition: focalPoint ?? style?.objectPosition,
          ...style,
        }}
      />
    </div>
  );
}
