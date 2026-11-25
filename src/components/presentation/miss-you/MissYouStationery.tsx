"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { MissYouTheme } from "@/experiences/miss-you/themes";

interface MissYouStationeryProps {
  recipientName: string;
  senderName: string;
  letter: string;
  theme: MissYouTheme;
}

/**
 * Scene 3 tactile stationery letter sheet for the personal message.
 */
export function MissYouStationery({
  recipientName,
  senderName,
  letter,
  theme,
}: MissYouStationeryProps) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-[460px] mx-auto rounded-[24px] p-5 sm:p-7 text-left shadow-lg overflow-hidden"
      style={{
        background: theme.palette.surface,
        border: `1.5px solid ${theme.palette.border}`,
      }}
    >
      {/* Subtle top rule accent without repeating Scene 1 postage stamp */}
      <div
        aria-hidden="true"
        className="mb-4 flex items-center justify-between border-b pb-2.5"
        style={{ borderColor: theme.palette.border }}
      >
        <span
          className="text-base font-medium"
          style={{ fontFamily: theme.typography.decoFont, color: theme.palette.primary }}
        >
          Dear {recipientName},
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: theme.palette.mutedText }}
        >
          Personal note
        </span>
      </div>

      <p
        className="whitespace-pre-line break-words text-[clamp(0.96rem,2.7vw,1.06rem)] leading-[1.72]"
        style={{
          fontFamily: theme.typography.bodyFont,
          color: theme.palette.text,
        }}
      >
        {letter}
      </p>

      <div className="mt-5 flex justify-end">
        <p
          className="text-xl"
          style={{
            fontFamily: theme.typography.decoFont,
            color: theme.palette.primary,
          }}
        >
          always yours, {senderName}
        </p>
      </div>
    </motion.article>
  );
}
