"use client";

import { Lottie } from "lottie-react";
import { cn } from "@/lib/cn";

interface LottieStickerProps {
  src: string;
  animate?: boolean;
  className?: string;
}

/**
 * Lazily loaded by StickerRenderer. Extracted so `lottie-react` is only in the
 * bundle when a licensed Lottie pack is actually used. lottie-react v3 accepts
 * a URL directly, so no manual fetch is needed.
 */
export default function LottieSticker({ src, animate = true, className }: LottieStickerProps) {
  return (
    <div className={cn("h-full w-full", className)} aria-hidden>
      <Lottie
        src={src}
        loop={animate}
        autoplay={animate}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
