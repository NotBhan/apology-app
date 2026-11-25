"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { MissYouTheme } from "@/experiences/miss-you/themes";
import { Icon } from "@/components/ui/icons";

interface MissYouDispatchCardProps {
  recipientName: string;
  senderName: string;
  headline: string;
  theme: MissYouTheme;
  onOpen: () => void;
}

/**
 * Scene 1 focal point for I Miss You: a personal dispatch establishing warmth
 * and arrival without duplicating Scene 2's distance breakdown.
 */
export function MissYouDispatchCard({
  recipientName,
  senderName,
  headline,
  theme,
  onOpen,
}: MissYouDispatchCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
      animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[390px] mx-auto"
    >
      <div
        className="relative overflow-hidden rounded-[26px] p-5 sm:p-7 text-left shadow-xl"
        style={{
          background: theme.palette.surface,
          border: `1.5px solid ${theme.palette.border}`,
        }}
      >
        {/* Top Stamp & Postmark Row */}
        <div className="flex items-center justify-between gap-3">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: theme.palette.primary }}
          >
            <Icon name="compass" size={12} />
            <span>Dispatched for you</span>
          </span>

          {/* Postage Stamp Emblem */}
          <div
            aria-hidden="true"
            className="flex flex-col items-center justify-center rounded-lg px-2.5 py-1 border border-dashed text-center shrink-0"
            style={{
              borderColor: theme.palette.primary,
              background: theme.palette.surfaceAlt,
              color: theme.palette.primary,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20.5s-7-4.5-8.8-8.7A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.8 5.3c-1.8 4.2-8.8 8.7-8.8 8.7Z" />
            </svg>
            <span className="mt-0.5 text-[8px] font-bold tracking-[0.16em]">
              {theme.stationery.stampText}
            </span>
          </div>
        </div>

        {/* Addressed Line */}
        <div
          className="mt-4 border-t border-b py-4 space-y-2"
          style={{ borderColor: theme.palette.border }}
        >
          <p className="text-xs font-medium" style={{ color: theme.palette.mutedText }}>
            For <span className="font-semibold" style={{ color: theme.palette.text }}>{recipientName}</span>
          </p>
          <h1
            className="text-[clamp(1.6rem,5.2vw,2.15rem)] font-semibold leading-[1.12] text-balance"
            style={{
              fontFamily: theme.typography.headingFont,
              color: theme.palette.text,
            }}
          >
            {headline}
          </h1>
          <p
            className="pt-0.5 text-base"
            style={{ fontFamily: theme.typography.decoFont, color: theme.palette.primary }}
          >
            from {senderName}
          </p>
        </div>

        {/* CTA Button inside dispatch */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex flex-1 min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-95 active:scale-[0.985] cursor-pointer"
            style={{
              background: theme.palette.primary,
              color: theme.isDark ? theme.palette.background : "#ffffff",
            }}
          >
            <span>Open this letter</span>
            <Icon name="arrow-right" size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
