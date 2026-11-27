"use client";

import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import type { ReactNode } from "react";
import type { MotionPreset } from "@/types/customization";
import type { ThemeMotion } from "@/types/theme";

interface SceneTransitionProps {
  /** Changing this key triggers the transition. */
  sceneKey: string;
  preset: ThemeMotion["transition"];
  direction?: 1 | -1;
  motionPreset?: MotionPreset;
  children: ReactNode;
}

interface SceneVariants {
  enter: (direction: 1 | -1) => TargetAndTransition;
  exit: (direction: 1 | -1) => TargetAndTransition;
}

const VARIANTS: Record<ThemeMotion["transition"], SceneVariants> = {
  crossfade: {
    enter: () => ({ opacity: 0 }),
    exit: () => ({ opacity: 0 }),
  },
  scale: {
    enter: (dir) => ({ opacity: 0, scale: dir > 0 ? 0.96 : 1.03 }),
    exit: (dir) => ({ opacity: 0, scale: dir > 0 ? 1.03 : 0.96 }),
  },
  card: {
    enter: (dir) => ({ opacity: 0, y: dir * 28, rotate: dir > 0 ? -0.6 : 0.6 }),
    exit: (dir) => ({ opacity: 0, y: -dir * 22, rotate: dir > 0 ? 0.6 : -0.6 }),
  },
  curtain: {
    enter: (dir) => ({
      opacity: 0,
      clipPath: dir > 0 ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)",
    }),
    exit: (dir) => ({
      opacity: 0,
      clipPath: dir > 0 ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)",
    }),
  },
  paper: {
    enter: (dir) => ({ opacity: 0, y: dir * 16, rotateX: -8 * dir }),
    exit: (dir) => ({ opacity: 0, y: -dir * 12, rotateX: 6 * dir }),
  },
};

/** Single place where scene changes are choreographed. */
export function SceneTransition({
  sceneKey,
  preset,
  direction = 1,
  motionPreset = "gentle",
  children,
}: SceneTransitionProps) {
  const reduce = useReducedMotion();
  const variant = VARIANTS[preset] ?? VARIANTS.crossfade;
  const still = reduce || motionPreset === "still";
  const duration = motionPreset === "expressive" ? 0.68 : 0.56;

  if (still) {
    return <div className="h-full w-full">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={sceneKey}
        className="h-full w-full"
        initial={variant.enter(direction)}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          rotate: 0,
          rotateX: 0,
          clipPath: "inset(0 0 0% 0)",
        }}
        exit={variant.exit(direction)}
        transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
