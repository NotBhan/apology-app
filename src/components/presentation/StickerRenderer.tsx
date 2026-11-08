"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import type { CharacterState, StickerPackId } from "@/types/sticker";
import type { StickerPackArt } from "@/sticker-packs/types";
import { getStickerPack, loadStickerArt } from "@/sticker-packs/registry";
import { cn } from "@/lib/cn";

const LottieSticker = lazy(() => import("./formats/LottieSticker"));
const RiveSticker = lazy(() => import("./formats/RiveSticker"));

export interface StickerRendererProps {
  packId: StickerPackId;
  state: CharacterState;
  animate?: boolean;
  className?: string;
  /** Optional licensed asset reference; falls back to original vector art. */
  asset?: { format: "lottie" | "rive" | "webp" | "apng"; src: string };
}

/**
 * Loads exactly one pack's art. Packs are independent chunks; switching packs
 * never re-downloads a theme and vice versa. A pack that fails to load
 * degrades to a labelled placeholder instead of a broken image.
 */
export function StickerRenderer({
  packId,
  state,
  animate = true,
  className,
  asset,
}: StickerRendererProps) {
  const pack = getStickerPack(packId);
  // One state object per pack id: a stale pack renders its placeholder instead
  // of briefly showing the previous pack's character.
  const [loaded, setLoaded] = useState<{ packId: StickerPackId; art: StickerPackArt } | null>(
    null,
  );
  const [failedFor, setFailedFor] = useState<StickerPackId | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStickerArt(packId)
      .then((art) => {
        if (!cancelled) setLoaded({ packId, art });
      })
      .catch(() => {
        if (!cancelled) setFailedFor(packId);
      });
    return () => {
      cancelled = true;
    };
  }, [packId]);

  const art = loaded?.packId === packId ? loaded.art : null;
  const failed = failedFor === packId;

  if (asset) {
    return (
      <Suspense fallback={<StickerPlaceholder accent={pack.accent} />}>
        {asset.format === "lottie" ? (
          <LottieSticker src={asset.src} animate={animate} className={className} />
        ) : asset.format === "rive" ? (
          <RiveSticker src={asset.src} className={className} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.src}
            alt={`${pack.characterName}, ${state}`}
            className={cn("h-full w-full object-contain", className)}
            decoding="async"
            loading="lazy"
          />
        )}
      </Suspense>
    );
  }

  if (failed) return <StickerFallback accent={pack.accent} label={pack.characterName} />;
  if (!art) return <StickerPlaceholder accent={pack.accent} />;

  return (
    <div role="img" aria-label={`${pack.characterName}, ${state}`} className="h-full w-full">
      {art.render(state)({ animate, className: cn("h-full w-full", className), state })}
    </div>
  );
}

function StickerPlaceholder({ accent }: { accent: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden>
      <span
        className="block h-[62%] w-[62%] rounded-full opacity-30"
        style={{ background: `radial-gradient(circle at 40% 35%, ${accent}, transparent 70%)` }}
      />
    </div>
  );
}

function StickerFallback({ accent, label }: { accent: string; label: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-[32%] px-2 text-center"
      style={{ background: `${accent}22` }}
      role="img"
      aria-label={label}
    >
      <span className="text-[10px] font-semibold leading-tight" style={{ color: accent }}>
        {label}
      </span>
    </div>
  );
}
