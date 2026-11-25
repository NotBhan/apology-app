"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { MissYouTheme } from "@/experiences/miss-you/themes";
import { Icon } from "@/components/ui/icons";

interface MissYouDistanceBridgeProps {
  senderName: string;
  recipientName: string;
  distanceNote?: string;
  reminders: string[];
  theme: MissYouTheme;
}

/**
 * Scene 2: Two distant points connected across an arc, paired with
 * interactive tactile reminder notes ("Little things that brought you to mind").
 */
export function MissYouDistanceBridge({
  senderName,
  recipientName,
  distanceNote,
  reminders,
  theme,
}: MissYouDistanceBridgeProps) {
  const reduce = useReducedMotion();
  const [activeNote, setActiveNote] = useState(0);

  const senderInitial = (senderName.trim()[0] || "M").toUpperCase();
  const recipientInitial = (recipientName.trim()[0] || "Y").toUpperCase();

  return (
    <div className="w-full max-w-[440px] mx-auto space-y-4">
      {/* Distance Bridge Illustration */}
      <div
        className="rounded-3xl p-4 sm:p-5 shadow-sm"
        style={{
          background: theme.palette.surface,
          border: `1px solid ${theme.palette.border}`,
        }}
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex flex-col items-center gap-1">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-xs"
              style={{
                background: theme.palette.surfaceAlt,
                color: theme.palette.primary,
                border: `1.5px solid ${theme.palette.primary}`,
              }}
            >
              {senderInitial}
            </span>
            <span className="text-[11px] font-medium opacity-75 truncate max-w-[90px]">
              {senderName}
            </span>
          </div>

          <div className="relative flex-1 px-2">
            <svg viewBox="0 0 180 44" className="w-full h-11 overflow-visible" aria-hidden="true">
              <path
                d="M 8 34 Q 90 -6 172 34"
                fill="none"
                stroke={theme.palette.border}
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <motion.path
                d="M 8 34 Q 90 -6 172 34"
                fill="none"
                stroke={theme.palette.primary}
                strokeWidth="2"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduce ? 0 : 1.0, ease: [0.22, 1, 0.36, 1] }}
              />
              <circle cx="90" cy="14" r="3.5" fill={theme.palette.accent} />
            </svg>
            <p
              className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] -mt-1.5"
              style={{ color: theme.palette.mutedText }}
            >
              {distanceNote || "Two places, one thought"}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-xs"
              style={{
                background: theme.palette.primary,
                color: theme.isDark ? theme.palette.background : "#ffffff",
              }}
            >
              {recipientInitial}
            </span>
            <span className="text-[11px] font-medium opacity-75 truncate max-w-[90px]">
              {recipientName}
            </span>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      {reminders.length > 0 ? (
        <div className="space-y-2.5 text-left">
          <p
            className="text-center text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: theme.palette.mutedText }}
          >
            Everyday sparks
          </p>
          <div className="space-y-2">
            {reminders.map((note, idx) => {
              const isSelected = activeNote === idx;
              return (
                <motion.button
                  key={`reminder-${idx}`}
                  type="button"
                  onClick={() => setActiveNote(idx)}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.35 }}
                  aria-pressed={isSelected}
                  className="flex w-full items-start gap-3 rounded-2xl p-3 text-left transition cursor-pointer"
                  style={{
                    background: isSelected ? theme.palette.surface : theme.palette.surfaceAlt,
                    border: `1.5px solid ${isSelected ? theme.palette.primary : theme.palette.border}`,
                  }}
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: isSelected ? theme.palette.primary : theme.palette.border,
                      color: isSelected
                        ? theme.isDark
                          ? theme.palette.background
                          : "#ffffff"
                        : theme.palette.text,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className="text-sm leading-relaxed"
                    style={{ color: theme.palette.text }}
                  >
                    {note}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-4 text-center"
          style={{
            background: theme.palette.surfaceAlt,
            border: `1px solid ${theme.palette.border}`,
          }}
        >
          <Icon name="sparkles" size={17} className="mx-auto mb-1.5 opacity-70" />
          <p className="text-sm leading-relaxed" style={{ color: theme.palette.mutedText }}>
            Even ordinary afternoon hours find ways of reminding me you aren&rsquo;t nearby.
          </p>
        </div>
      )}
    </div>
  );
}
