"use client";

import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BirthdayTheme } from "@/experiences/birthday/themes";
import { normalizeBirthdayPhotos, type BirthdayPhotoItem } from "@/experiences/birthday/schema";
import { Icon } from "@/components/ui/icons";

type Stage = "sealed" | "cracking" | "opening" | "rising" | "unfolded";

export interface BirthdayEnvelopeProps {
  recipientName: string;
  senderName: string;
  message?: string;
  photos?: BirthdayPhotoItem[];
  theme: BirthdayTheme;
  onOpened?: () => void;
  className?: string;
}

export function BirthdayEnvelope({
  recipientName,
  senderName,
  message,
  photos = [],
  theme,
  onOpened,
  className = "",
}: BirthdayEnvelopeProps) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("sealed");
  const normalizedPhotos = normalizeBirthdayPhotos(photos);

  const open = useCallback(() => {
    if (stage !== "sealed") return;
    if (reduce) {
      setStage("unfolded");
      onOpened?.();
      return;
    }
    setStage("cracking");
    window.setTimeout(() => setStage("opening"), 350);
    window.setTimeout(() => setStage("rising"), 900);
    window.setTimeout(() => {
      setStage("unfolded");
      onOpened?.();
    }, 1500);
  }, [stage, reduce, onOpened]);

  const revealed = stage === "unfolded";
  const flapOpen = stage === "opening" || stage === "rising" || revealed;
  const letterRising = stage === "rising" || revealed;

  return (
    <div className={`relative flex w-full flex-col items-center ${className}`}>
      {/* Outer Envelope Container */}
      <motion.div
        className="relative cursor-pointer"
        style={{
          width: "min(88vw, 360px)",
          height: "calc(min(88vw, 360px) / 1.45)",
        }}
        onClick={open}
        animate={{
          opacity: revealed ? 0.35 : 1,
          scale: revealed ? 0.94 : 1,
          y: revealed ? -10 : 0,
        }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Envelope Back Panel */}
        <div
          className="absolute inset-0 rounded-[14px] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.35)]"
          style={{ background: theme.envelope.paper }}
        />

        {/* Interior Letter Peeking out / Rising */}
        <motion.div
          className="absolute left-[5%] right-[5%] origin-bottom overflow-hidden rounded-[10px] p-4 text-center shadow-sm"
          style={{
            top: "10%",
            height: "85%",
            background: theme.palette.surface,
            border: `1.5px solid ${theme.palette.border}`,
            zIndex: letterRising ? 30 : 5,
          }}
          initial={false}
          animate={{
            y: letterRising ? "-26%" : "4%",
            scale: letterRising ? 1 : 0.94,
            rotateX: letterRising ? 0 : 10,
          }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex h-full flex-col items-center justify-center gap-1.5 px-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: theme.palette.accent }}
            >
              Personal Letter
            </span>
            <span
              className="text-base font-bold truncate max-w-full"
              style={{
                fontFamily: theme.typography.headingFont,
                color: theme.palette.text,
              }}
            >
              {recipientName || "Friend"}
            </span>
            {message ? (
              <p
                className="line-clamp-2 text-xs opacity-80 italic max-w-full"
                style={{ color: theme.palette.mutedText }}
              >
                {message}
              </p>
            ) : (
              <span
                className="text-xs italic opacity-75 truncate max-w-full"
                style={{ color: theme.palette.mutedText }}
              >
                A special wish for your day
              </span>
            )}
            <span className="text-[11px] font-medium opacity-65" style={{ color: theme.palette.mutedText }}>
              Sent with love
            </span>
          </div>
        </motion.div>

        {/* Envelope Pocket Front */}
        <div className="absolute inset-0 z-20 overflow-hidden rounded-[14px] pointer-events-none">
          <svg viewBox="0 0 360 248" className="h-full w-full" preserveAspectRatio="none">
            {/* Left triangle flap */}
            <path d="M 0 0 L 180 150 L 0 248 Z" fill={theme.envelope.paper} opacity="0.96" />
            {/* Right triangle flap */}
            <path d="M 360 0 L 180 150 L 360 248 Z" fill={theme.envelope.paper} opacity="0.96" />
            {/* Bottom trapezoid fold */}
            <path
              d="M 0 248 L 180 130 L 360 248 Z"
              fill={theme.envelope.flap}
              stroke={theme.envelope.accent}
              strokeWidth="1"
              opacity="0.92"
            />
          </svg>
        </div>

        {/* Top Folding Flap with Seal */}
        <motion.div
          className="absolute inset-x-0 top-0 z-[25] origin-top overflow-visible"
          style={{
            height: "62%",
            transformStyle: "preserve-3d",
          }}
          initial={false}
          animate={{
            rotateX: flapOpen ? -168 : 0,
            zIndex: flapOpen ? 0 : 25,
          }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        >
          <svg viewBox="0 0 360 155" className="h-full w-full" preserveAspectRatio="none">
            <path
              d="M 0 0 L 180 148 L 360 0 Z"
              fill={theme.envelope.flap}
              stroke={theme.envelope.accent}
              strokeWidth="1.2"
            />
          </svg>

          {/* Decorative Seal Sticker (Centrally Placed on Flap Point) */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: "calc(100% - 24px)",
            }}
          >
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              disabled={revealed}
              aria-label={`Open birthday letter from ${senderName || "your friend"}`}
              className="group relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2"
              style={{
                background: theme.envelope.seal,
                color: theme.palette.surface,
              }}
              animate={
                stage === "cracking"
                  ? { scale: [1, 1.25, 0.85], rotate: [0, -10, 10, 0] }
                  : undefined
              }
            >
              {theme.envelope.sealSymbol === "cake" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C11.45 2 11 2.45 11 3C11 3.55 11.45 4 12 4C12.55 4 13 3.55 13 3C13 2.45 12.55 2 12 2ZM6 8C4.9 8 4 8.9 4 10V11H20V10C20 8.9 19.1 8 18 8H15V6H13V8H11V6H9V8H6ZM4 13V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V13H4Z" />
                </svg>
              ) : theme.envelope.sealSymbol === "star" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                </svg>
              ) : theme.envelope.sealSymbol === "heart" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              ) : theme.envelope.sealSymbol === "flower" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="12" cy="6" r="2.5" opacity="0.9" />
                  <circle cx="12" cy="18" r="2.5" opacity="0.9" />
                  <circle cx="6" cy="12" r="2.5" opacity="0.9" />
                  <circle cx="18" cy="12" r="2.5" opacity="0.9" />
                </svg>
              ) : theme.envelope.sealSymbol === "stamp" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 13C10.9 13 10 12.1 10 11C10 9.9 10.9 9 12 9C13.1 9 14 9.9 14 11C14 12.1 13.1 13 12 13ZM18 7C17.4 7 16.8 7.2 16.3 7.6L14 9.9C13.5 9.4 12.8 9 12 9C11.2 9 10.5 9.4 10 9.9L7.7 7.6C7.2 7.2 6.6 7 6 7C4.3 7 3 8.3 3 10C3 11.2 3.7 12.3 4.8 12.7L8 15L4 21L7 21L10 16L12 17.5L14 16L17 21L20 21L16 15L19.2 12.7C20.3 12.3 21 11.2 21 10C21 8.3 19.7 7 18 7Z" />
                </svg>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      {/* Sealed Instruction Prompt */}
      {!revealed && (
        <div className="mt-4 text-center">
          <p
            className="text-xs font-semibold tracking-wide"
            style={{ color: theme.palette.mutedText }}
          >
            {stage === "sealed" ? "Tap the seal to open your letter" : "Opening letter…"}
          </p>
        </div>
      )}

      {/* Unfolded Full Personal Letter Stationery */}
      {revealed && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 w-full max-w-[520px] rounded-3xl p-6 sm:p-9 shadow-xl text-left"
          style={{
            background: theme.palette.surface,
            border: `1.5px solid ${theme.palette.border}`,
            color: theme.palette.text,
          }}
        >
          {/* Stationery Header */}
          <div
            className="flex items-center justify-between border-b pb-4 mb-6"
            style={{ borderColor: theme.palette.border }}
          >
            <div>
              <p
                className="text-[10px] uppercase font-bold tracking-[0.2em]"
                style={{ color: theme.palette.accent }}
              >
                Personal Letter
              </p>
              <p className="text-sm font-semibold opacity-85" style={{ color: theme.palette.text }}>
                Dear {recipientName || "Friend"},
              </p>
            </div>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                background: `${theme.palette.accent}20`,
                color: theme.palette.primary,
              }}
            >
              <Icon name="message" size={16} />
            </div>
          </div>

          {/* Main Message Body */}
          <div className="space-y-4">
            <p
              className="whitespace-pre-line text-[clamp(1.05rem,3.2vw,1.3rem)] leading-relaxed font-normal"
              style={{
                fontFamily: theme.typography.bodyFont,
                color: theme.palette.text,
              }}
            >
              {message || "Wishing you another wonderful year filled with happiness, adventures, and unforgettable moments!"}
            </p>
          </div>

          {/* Attached Celebration Photos (if present) */}
          {normalizedPhotos.length > 0 && (
            <div className="mt-8 pt-6 border-t" style={{ borderColor: theme.palette.border }}>
              <p
                className="text-[11px] uppercase tracking-[0.16em] font-semibold mb-3 text-left"
                style={{ color: theme.palette.mutedText }}
              >
                Celebration Moments
              </p>
              <div className="grid grid-cols-2 gap-3">
                {normalizedPhotos.map((photo, i) => (
                  <div
                    key={photo.id || `photo-${i}`}
                    className="overflow-hidden rounded-2xl p-1.5 shadow-sm"
                    style={{
                      background: theme.palette.background,
                      border: `1px solid ${theme.palette.border}`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || `Birthday memory ${i + 1}`}
                      className="h-32 sm:h-36 w-full rounded-xl object-cover"
                    />
                    {photo.caption ? (
                      <p
                        className="mt-1 truncate text-center text-[10px] opacity-75"
                        style={{ color: theme.palette.mutedText }}
                      >
                        {photo.caption}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature Sign-Off */}
          <div className="mt-8 pt-4 text-right border-t border-dashed" style={{ borderColor: theme.palette.border }}>
            <p className="text-xs italic opacity-75" style={{ color: theme.palette.mutedText }}>
              With warmest wishes,
            </p>
            <p
              className="text-lg font-bold"
              style={{
                fontFamily: theme.typography.headingFont,
                color: theme.palette.primary,
              }}
            >
              {senderName || "Your friend"}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
