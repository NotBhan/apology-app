"use client";

import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import type { ReactNode } from "react";
import type { ThemeMotion } from "@/types/theme";

interface SceneTransitionProps {
  /** Changing this key triggers the transition. */
  sceneKey: string;
  preset: ThemeMotion["transition"];
  children: ReactNode;
}

interface SceneVariants {
  enter: TargetAndTransition;
  exit: TargetAndTransition;
}

const VARIANTS: Record<ThemeMotion["transition"], SceneVariants> = {
  crossfade: {
    enter: { opacity: 0 },
    exit: { opacity: 0 },
  },
  scale: {
    enter: { opacity: 0, scale: 0.96 },
    exit: { opacity: 0, scale: 1.03 },
  },
  card: {
    enter: { opacity: 0, y: 30, rotate: -0.6 },
    exit: { opacity: 0, y: -24, rotate: 0.6 },
  },
  curtain: {
    enter: { opacity: 0, clipPath: "inset(0 0 100% 0)" },
    exit: { opacity: 0, clipPath: "inset(100% 0 0 0)" },
  },
  paper: {
    enter: { opacity: 0, y: 16, rotateX: -8 },
    exit: { opacity: 0, y: -12, rotateX: 6 },
  },
};

/** Single place where scene changes are choreographed. */
export function SceneTransition({ sceneKey, preset, children }: SceneTransitionProps) {
  const reduce = useReducedMotion();
  const variant = VARIANTS[preset] ?? VARIANTS.crossfade;

  if (reduce) {
    return <div className="h-full w-full">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={sceneKey}
        className="h-full w-full"
        initial={variant.enter}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          rotate: 0,
          rotateX: 0,
          clipPath: "inset(0 0 0% 0)",
        }}
        exit={variant.exit}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
