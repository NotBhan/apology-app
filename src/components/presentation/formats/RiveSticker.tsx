"use client";

import { useRive } from "@rive-app/react-canvas";
import { cn } from "@/lib/cn";

interface RiveStickerProps {
  src: string;
  /** State machine name declared inside the .riv asset. */
  stateMachine?: string;
  className?: string;
}

/**
 * Lazily loaded by StickerRenderer. Rive is reserved for genuinely
 * interactive licensed characters; original packs use inline SVG.
 *
 * Inputs are driven by the asset's own state machine so this component never
 * mutates a hook result itself.
 */
export default function RiveSticker({
  src,
  stateMachine = "State Machine 1",
  className,
}: RiveStickerProps) {
  const { RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    autoplay: true,
  });

  return (
    <div className={cn("h-full w-full", className)} aria-hidden>
      <RiveComponent style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
