"use client";

import { motion } from "framer-motion";
import type { BirthdayTheme } from "@/experiences/birthday/themes";

interface BirthdayCardProps {
  recipientName: string;
  senderName: string;
  headline: string;
  age?: number;
  theme: BirthdayTheme;
  className?: string;
}

export function BirthdayCard({
  recipientName,
  senderName,
  headline,
  age,
  theme,
  className = "",
}: BirthdayCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={`relative mx-auto w-full max-w-[460px] overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl text-center ${className}`}
      style={{
        background: theme.palette.surface,
        border: `2px solid ${theme.palette.border}`,
        color: theme.palette.text,
      }}
    >
      {/* Decorative Corner Ornaments based on Theme */}
      <div className="pointer-events-none absolute inset-0 p-3 flex flex-col justify-between" aria-hidden="true">
        <div className="flex justify-between">
          <svg width="12" height="12" viewBox="0 0 24 24" fill={theme.palette.accent}>
            <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" />
          </svg>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={theme.palette.accent}>
            <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" />
          </svg>
        </div>
        <div className="flex justify-between">
          <svg width="12" height="12" viewBox="0 0 24 24" fill={theme.palette.accent}>
            <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" />
          </svg>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={theme.palette.accent}>
            <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" />
          </svg>
        </div>
      </div>

      {/* Decorative Header Badge */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
           style={{
             background: `${theme.palette.accent}20`,
             color: theme.palette.primary,
           }}>
        <span>A Special Day</span>
        {age ? <span>• Chapter {age}</span> : null}
      </div>

      {/* Recipient's Name */}
      <h1
        className="text-[clamp(2.2rem,8vw,3.4rem)] leading-[1.1] font-bold tracking-tight mb-3"
        style={{
          fontFamily: theme.typography.headingFont,
          color: theme.palette.primary,
        }}
      >
        {recipientName}
      </h1>

      {/* Headline Wish */}
      <p
        className="text-[clamp(1.15rem,4vw,1.45rem)] leading-snug font-medium mb-6"
        style={{ color: theme.palette.text }}
      >
        {headline}
      </p>

      {/* Ribbon Divider */}
      <div className="mx-auto mb-6 flex items-center justify-center gap-2 opacity-60" aria-hidden="true">
        <span className="h-[1px] w-12" style={{ background: theme.palette.border }} />
        <svg width="10" height="10" viewBox="0 0 24 24" fill={theme.palette.accent}>
          <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
        </svg>
        <span className="h-[1px] w-12" style={{ background: theme.palette.border }} />
      </div>

      {/* Sender Greeting Intro */}
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.palette.mutedText }}>
        From {senderName}
      </p>
    </motion.div>
  );
}
