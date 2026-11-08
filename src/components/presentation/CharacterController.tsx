"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CharacterState, StickerPackId } from "@/types/sticker";
import type { ThemeMotion } from "@/types/theme";
import { StickerRenderer } from "./StickerRenderer";
import { cn } from "@/lib/cn";

export interface CharacterControllerProps {
  packId: StickerPackId;
  state: CharacterState;
  animate?: boolean;
  entrance?: ThemeMotion["characterEntrance"];
  className?: string;
  /** Scene-relative box in percentages. */
  placement?: { x: number; y: number; width: number };
  /** Delay before the character enters, in seconds. */
  delay?: number;
}

const ENTRANCES: Record<
  NonNullable<CharacterControllerProps["entrance"]>,
  { initial: Record<string, number>; animate: Record<string, number> }
> = {
  rise: { initial: { opacity: 0, y: 46, scale: 0.94 }, animate: { opacity: 1, y: 0, scale: 1 } },
  pop: { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 } },
  slide: { initial: { opacity: 0, x: -48 }, animate: { opacity: 1, x: 0 } },
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  unfold: {
    initial: { opacity: 0, scaleY: 0.3, rotateX: -40 },
    animate: { opacity: 1, scaleY: 1, rotateX: 0 },
  },
};

/**
 * Owns character entrance and state transitions. Scene changes animate the
 * character in place rather than remounting the SVG, so blinking resumes
 * smoothly and the pack art is not re-fetched.
 */
export function CharacterController({
  packId,
  state,
  animate = true,
  entrance = "rise",
  className,
  placement,
  delay = 0,
}: CharacterControllerProps) {
  const reduce = useReducedMotion();
  const preset = ENTRANCES[entrance] ?? ENTRANCES.rise;

  return (
    <motion.div
      className={cn("pointer-events-none select-none", className)}
      style={
        placement
          ? {
              position: "absolute",
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              width: `${placement.width}%`,
              transform: "translate(-50%, -50%)",
              aspectRatio: "1 / 1",
            }
          : undefined
      }
      initial={reduce ? false : preset.initial}
      animate={reduce ? undefined : preset.animate}
      transition={{
        duration: reduce ? 0 : 0.85,
        delay: reduce ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <motion.div
        animate={reduce || !animate ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="h-full w-full"
      >
        <StickerRenderer packId={packId} state={state} animate={animate} />
      </motion.div>
    </motion.div>
  );
}
