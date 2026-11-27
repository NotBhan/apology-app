"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useMounted";
import type { BirthdayTheme } from "@/experiences/birthday/themes";
import type { BirthdayGiftReveal } from "@/experiences/birthday/schema";

type GiftStage = "wrapped" | "untying" | "opening" | "opened";

export interface BirthdayGiftBoxProps {
  recipientName: string;
  senderName: string;
  theme: BirthdayTheme;
  animate?: boolean;
  revealMode?: BirthdayGiftReveal;
  onOpened?: () => void;
  className?: string;
}

export function BirthdayGiftBox({
  recipientName,
  senderName,
  theme,
  animate = true,
  revealMode = "tap-unwrap",
  onOpened,
  className = "",
}: BirthdayGiftBoxProps) {
  const reduce = useReducedMotionSafe();
  const still = reduce || !animate;
  const [stage, setStage] = useState<GiftStage>(revealMode === "direct" ? "opened" : "wrapped");
  const timersRef = useRef<number[]>([]);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const openGift = useCallback(() => {
    if (stage !== "wrapped") return;
    if (still || revealMode === "direct") {
      setStage("opened");
      onOpened?.();
      return;
    }

    setStage("untying");
    timersRef.current.push(window.setTimeout(() => setStage("opening"), 350));
    timersRef.current.push(
      window.setTimeout(() => {
        setStage("opened");
        onOpened?.();
      }, 1200),
    );
  }, [stage, still, revealMode, onOpened]);

  const isUntied = stage === "untying" || stage === "opening" || stage === "opened";
  const isOpen = stage === "opening" || stage === "opened";
  const isComplete = stage === "opened";

  const idPrefix = `bday-gift-${theme.id}-${uid}`;

  return (
    <div className={`relative flex w-full flex-col items-center select-none ${className}`}>
      {/* Outer Gift Box Container */}
      <motion.div
        className="relative flex items-center justify-center cursor-pointer"
        style={{
          width: "min(88vw, 340px)",
          height: "290px",
        }}
        onClick={openGift}
        animate={
          still
            ? undefined
            : isComplete
              ? { scale: 0.98, opacity: 0.85 }
              : { y: [0, -6, 0] }
        }
        transition={
          still || isComplete
            ? { duration: 0.4 }
            : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <svg
          viewBox="0 0 340 290"
          className="h-full w-full overflow-visible drop-shadow-xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Box Body Gradient */}
            <linearGradient id={`${idPrefix}-box-grad`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={theme.palette.surface} />
              <stop offset="100%" stopColor={theme.envelope.paper || theme.palette.surface} />
            </linearGradient>

            {/* Box Shadow Filter */}
            <radialGradient id={`${idPrefix}-floor-shadow`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#000000" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* Ribbon Satin Gradient */}
            <linearGradient id={`${idPrefix}-ribbon-grad`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={theme.palette.primary} />
              <stop offset="30%" stopColor={theme.palette.accent || theme.palette.primary} />
              <stop offset="60%" stopColor={theme.palette.primary} />
              <stop offset="100%" stopColor={theme.palette.primary} />
            </linearGradient>

            {/* Ribbon Bow Highlight */}
            <linearGradient id={`${idPrefix}-bow-grad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.palette.accent || theme.palette.primary} />
              <stop offset="100%" stopColor={theme.palette.primary} />
            </linearGradient>

            {/* Internal Glow when Unboxed */}
            <radialGradient id={`${idPrefix}-inside-glow`} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffd43b" stopOpacity="0.9" />
              <stop offset="45%" stopColor={theme.palette.primary} stopOpacity="0.6" />
              <stop offset="100%" stopColor={theme.palette.primary} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Floor Shadow */}
          <ellipse
            cx="170"
            cy="270"
            rx="110"
            ry="14"
            fill={`url(#${idPrefix}-floor-shadow)`}
            className="transition-all duration-500"
          />

          {/* Internal Glow Burst when Lid Lifts */}
          {isOpen && (
            <motion.g
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 0.8], scale: [0.6, 1.25, 1.1] }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <ellipse cx="170" cy="115" rx="90" ry="35" fill={`url(#${idPrefix}-inside-glow)`} />
              {/* Radiating sparkle rays */}
              <path
                d="M 170 115 L 140 30 M 170 115 L 200 30 M 170 115 L 100 60 M 170 115 L 240 60"
                stroke="#ffe066"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.8"
              />
              <circle cx="140" cy="30" r="3" fill="#ffe066" />
              <circle cx="200" cy="30" r="3" fill="#ffe066" />
              <circle cx="100" cy="60" r="2.5" fill="#ffe066" />
              <circle cx="240" cy="60" r="2.5" fill="#ffe066" />
            </motion.g>
          )}

          {/* BOX BASE (Main Container) */}
          <g id="gift-box-base">
            {/* Box Body */}
            <rect
              x="58"
              y="110"
              width="224"
              height="150"
              rx="16"
              fill={`url(#${idPrefix}-box-grad)`}
              stroke={theme.palette.border}
              strokeWidth="2"
            />

            {/* Pattern/Texture on Box Body (theme specific subtle details) */}
            {theme.decorations.family === "confetti" && (
              <g opacity="0.45">
                <circle cx="85" cy="140" r="3" fill={theme.palette.primary} />
                <circle cx="120" cy="220" r="2.5" fill={theme.palette.secondary} />
                <circle cx="225" cy="145" r="3" fill={theme.palette.accent} />
                <circle cx="240" cy="230" r="2.5" fill={theme.palette.primary} />
                <circle cx="95" cy="240" r="2" fill={theme.palette.accent} />
              </g>
            )}

            {theme.decorations.family === "midnight-gold" && (
              <g opacity="0.6">
                <polygon points="90,140 92,144 96,144 93,146 94,150 90,147 86,150 87,146 84,144 88,144" fill="#ffd43b" />
                <polygon points="235,160 236.5,163 240,163 237.5,165 238.5,168 235,166 231.5,168 232.5,165 230,163 233.5,163" fill="#ffd43b" />
                <polygon points="105,225 106.5,228 110,228 107.5,230 108.5,233 105,231 101.5,233 102.5,230 100,228 103.5,228" fill="#ffd43b" />
              </g>
            )}

            {/* Horizontal Ribbon on Body */}
            <rect
              x="58"
              y="170"
              width="224"
              height="34"
              fill={`url(#${idPrefix}-ribbon-grad)`}
              opacity="0.95"
            />
            {/* Horizontal Ribbon Edge Shading */}
            <line x1="58" y1="170" x2="282" y2="170" stroke={theme.palette.accent || "#fff"} strokeWidth="1" opacity="0.5" />
            <line x1="58" y1="204" x2="282" y2="204" stroke="#000" strokeWidth="1" opacity="0.15" />

            {/* Vertical Ribbon on Body */}
            <rect
              x="152"
              y="110"
              width="36"
              height="150"
              fill={`url(#${idPrefix}-ribbon-grad)`}
              opacity="0.95"
            />
            {/* Vertical Ribbon Edge Shading */}
            <line x1="152" y1="110" x2="152" y2="260" stroke={theme.palette.accent || "#fff"} strokeWidth="1" opacity="0.5" />
            <line x1="188" y1="110" x2="188" y2="260" stroke="#000" strokeWidth="1" opacity="0.15" />

            {/* Ribbon Cross Center Medallion on Body */}
            <rect
              x="152"
              y="170"
              width="36"
              height="34"
              fill={theme.palette.primary}
            />
            <circle cx="170" cy="187" r="5" fill={theme.palette.accent || "#fff"} opacity="0.8" />
          </g>

          {/* GIFT TAG (Hangs from Ribbon) */}
          <g id="gift-box-tag" transform="translate(188, 120) rotate(12)">
            {/* Tag String */}
            <line x1="0" y1="0" x2="14" y2="16" stroke={theme.palette.accent || "#d4af37"} strokeWidth="1.5" />
            {/* Tag Body */}
            <g transform="translate(6, 14)">
              <rect
                x="0"
                y="0"
                width="72"
                height="46"
                rx="6"
                fill={theme.palette.surface}
                stroke={theme.palette.border}
                strokeWidth="1.5"
                filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))"
              />
              {/* Tag Hole */}
              <circle cx="8" cy="8" r="2.5" fill={theme.palette.border} />
              {/* Tag Text */}
              <text
                x="14"
                y="18"
                fontSize="8"
                fontWeight="bold"
                letterSpacing="0.1em"
                fill={theme.palette.accent || theme.palette.primary}
              >
                FOR
              </text>
              <text
                x="14"
                y="30"
                fontSize="11"
                fontWeight="bold"
                fill={theme.palette.text}
                className="truncate"
              >
                {recipientName ? (recipientName.length > 8 ? recipientName.slice(0, 7) + "…" : recipientName) : "You"}
              </text>
              <text
                x="14"
                y="40"
                fontSize="7.5"
                fontWeight="500"
                fill={theme.palette.mutedText}
              >
                from {senderName ? (senderName.length > 7 ? senderName.slice(0, 6) + "…" : senderName) : "a friend"}
              </text>
            </g>
          </g>

          {/* BOX LID & BOW (Animated Motion Group) */}
          <motion.g
            id="gift-box-lid-group"
            style={{ transformOrigin: "170px 85px" }}
            initial={false}
            animate={
              reduce
                ? undefined
                : isOpen
                  ? { y: -72, rotate: -14, scale: 1.05 }
                  : isUntied
                    ? { y: -8, rotate: [-1, 1, -1, 0] }
                    : { y: 0, rotate: 0 }
            }
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Lid Drop Shadow on Box Body */}
            <rect
              x="52"
              y="104"
              width="236"
              height="8"
              rx="4"
              fill="#000000"
              opacity="0.18"
            />

            {/* Lid Main Rect */}
            <rect
              x="50"
              y="74"
              width="240"
              height="36"
              rx="10"
              fill={`url(#${idPrefix}-box-grad)`}
              stroke={theme.palette.border}
              strokeWidth="2"
            />

            {/* Vertical Ribbon across Lid */}
            <rect
              x="152"
              y="74"
              width="36"
              height="36"
              fill={`url(#${idPrefix}-ribbon-grad)`}
            />
            <line x1="152" y1="74" x2="152" y2="110" stroke={theme.palette.accent || "#fff"} strokeWidth="1" opacity="0.5" />
            <line x1="188" y1="74" x2="188" y2="110" stroke="#000" strokeWidth="1" opacity="0.15" />

            {/* THE LUXURY RIBBON BOW (Positioned atop lid at x: 170, y: 74) */}
            <g id="gift-ribbon-bow">
              {/* Left Ribbon Tail */}
              <motion.path
                d="M 160 76 Q 135 95 125 122 Q 135 116 146 112 Q 154 94 164 76 Z"
                fill={`url(#${idPrefix}-bow-grad)`}
                opacity="0.9"
                animate={isUntied ? { rotate: [-5, -18], opacity: 0.7 } : { rotate: 0 }}
                transition={{ duration: 0.4 }}
              />

              {/* Right Ribbon Tail */}
              <motion.path
                d="M 180 76 Q 205 95 215 122 Q 205 116 194 112 Q 186 94 176 76 Z"
                fill={`url(#${idPrefix}-bow-grad)`}
                opacity="0.9"
                animate={isUntied ? { rotate: [5, 18], opacity: 0.7 } : { rotate: 0 }}
                transition={{ duration: 0.4 }}
              />

              {/* Left Bow Loop */}
              <motion.path
                d="M 170 74 C 140 38, 98 42, 108 66 C 118 80, 150 76, 170 74 Z"
                fill={`url(#${idPrefix}-bow-grad)`}
                stroke={theme.palette.accent || "#fff"}
                strokeWidth="0.8"
                animate={isUntied ? { scale: [1, 1.15, 0.9], x: -8 } : { scale: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              />
              {/* Left Loop Interior Shadow */}
              <path
                d="M 155 72 C 135 52, 114 54, 120 66 C 126 74, 145 72, 155 72 Z"
                fill={theme.palette.primary}
                opacity="0.45"
              />

              {/* Right Bow Loop */}
              <motion.path
                d="M 170 74 C 200 38, 242 42, 232 66 C 222 80, 190 76, 170 74 Z"
                fill={`url(#${idPrefix}-bow-grad)`}
                stroke={theme.palette.accent || "#fff"}
                strokeWidth="0.8"
                animate={isUntied ? { scale: [1, 1.15, 0.9], x: 8 } : { scale: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              />
              {/* Right Loop Interior Shadow */}
              <path
                d="M 185 72 C 205 52, 226 54, 220 66 C 214 74, 195 72, 185 72 Z"
                fill={theme.palette.primary}
                opacity="0.45"
              />

              {/* Center Bow Knot */}
              <ellipse
                cx="170"
                cy="74"
                rx="14"
                ry="11"
                fill={theme.palette.accent || theme.palette.primary}
                stroke="#ffffff"
                strokeWidth="1.2"
              />
              <circle cx="170" cy="74" r="5" fill={theme.palette.primary} />
            </g>
          </motion.g>
        </svg>

        {/* Interactive Tap Area / Accessible Button (visible focus ring without opacity-0 hiding it) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openGift();
          }}
          disabled={isComplete}
          aria-label={`Open birthday gift box for ${recipientName || "your friend"}`}
          className="absolute inset-0 h-full w-full bg-transparent text-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-2xl"
          style={{ ["--tw-ring-color" as string]: theme.palette.primary }}
        >
          Open Gift
        </button>
      </motion.div>

      {/* Tap Instruction / Prompt */}
      <div className="mt-2 text-center">
        <p
          className="text-xs font-semibold tracking-wide transition-opacity duration-300"
          style={{ color: theme.palette.mutedText }}
        >
          {isComplete
            ? "Gift box unwrapped!"
            : stage === "untying" || stage === "opening"
              ? "Unwrapping your gift…"
              : "Tap the gift box to open"}
        </p>
      </div>
    </div>
  );
}
