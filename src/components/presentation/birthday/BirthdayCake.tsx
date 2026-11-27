"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useMounted";
import type { BirthdayCandleMode } from "@/experiences/birthday/schema";
import type { BirthdayTheme } from "@/experiences/birthday/themes";

interface BirthdayCakeProps {
  theme: BirthdayTheme;
  candleCount?: number;
  animate?: boolean;
  candleMode?: BirthdayCandleMode;
  ctaLabel?: string;
  isBlownOut?: boolean;
  onBlowOut?: () => void;
  onRelight?: () => void;
  className?: string;
}

export function BirthdayCake({
  theme,
  candleCount = 3,
  animate = true,
  candleMode = "tap-relight",
  ctaLabel = "Blow out the candles",
  isBlownOut: controlledBlownOut,
  onBlowOut,
  onRelight,
  className = "",
}: BirthdayCakeProps) {
  const [internalBlownOut, setInternalBlownOut] = useState(false);
  const reduce = useReducedMotionSafe();
  const still = reduce || !animate;
  const idPrefix = useId().replace(/:/g, "");

  const blownOut = controlledBlownOut !== undefined ? controlledBlownOut : internalBlownOut;
  const canRelight = candleMode === "tap-relight";
  const count = Math.max(1, Math.min(7, candleCount));
  const isThreeTier = theme.cake.tiers === 3;
  const topY = isThreeTier ? 48 : 70;
  const candleHeight = isThreeTier ? 28 : 36;
  const candleSpan = isThreeTier
    ? (count <= 3 ? 44 : 56)
    : (count <= 3 ? 74 : count <= 5 ? 96 : 112);

  function handleBlowOut() {
    if (blownOut) {
      if (canRelight) {
        handleRelight();
      }
      return;
    }
    setInternalBlownOut(true);
    onBlowOut?.();
  }

  function handleRelight() {
    setInternalBlownOut(false);
    onRelight?.();
  }

  // Calculate candle horizontal positions across top tier
  const candlePositions = Array.from({ length: count }, (_, i) => {
    if (count === 1) return 150;
    const start = 150 - candleSpan / 2;
    const end = 150 + candleSpan / 2;
    return Math.round((start + (i * (end - start)) / (count - 1)) * 10) / 10;
  });

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Interactive Cake SVG Illustration */}
      <button
        type="button"
        onClick={handleBlowOut}
        disabled={blownOut && !canRelight}
        aria-label={
          blownOut
            ? canRelight
              ? "Birthday cake with extinguished candles, tap to relight"
              : "Birthday cake with extinguished candles"
            : "Interactive birthday cake with lit candles"
        }
        className="group relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-2xl p-2 transition-transform active:scale-[0.98]"
        style={{
          outlineColor: theme.palette.primary,
        }}
      >
        <svg
          viewBox="0 0 300 240"
          className="w-[min(80vw,280px)] sm:w-[320px] h-auto drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient
              id={`${idPrefix}-flame-glow`}
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <stop offset="0%" stopColor="#fff9db" stopOpacity="1" />
              <stop offset="35%" stopColor="#ffd43b" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#ff922b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f76707" stopOpacity="0" />
            </radialGradient>

            <linearGradient id={`${idPrefix}-plate-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={theme.cake.plate} />
              <stop offset="100%" stopColor={theme.palette.border} />
            </linearGradient>

            <linearGradient id={`${idPrefix}-frosting-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={theme.cake.frosting} />
              <stop offset="100%" stopColor={theme.cake.base} stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Pedestal Cake Platter */}
          <ellipse cx="150" cy="226" rx="124" ry="12" fill={theme.palette.border} opacity="0.4" />
          <path
            d="M 130 220 L 136 232 L 164 232 L 170 220 Z"
            fill={`url(#${idPrefix}-plate-grad)`}
            stroke={theme.palette.border}
            strokeWidth="1.5"
          />
          <ellipse
            cx="150"
            cy="220"
            rx="120"
            ry="11"
            fill={`url(#${idPrefix}-plate-grad)`}
            stroke={theme.palette.border}
            strokeWidth="1.5"
          />

          {/* Cake Body: 2-Tier vs 3-Tier */}
          {!isThreeTier ? (
            /* ================= 2-TIER CAKE ================= */
            <>
              {/* Bottom Cake Tier */}
              <g id="bottom-tier">
                {/* Bottom tier base body - curves down to platter rim */}
                <path
                  d="M 46 160 L 46 210 C 46 226 254 226 254 210 L 254 160 Z"
                  fill={theme.cake.base}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                {/* Bottom tier frosting top surface */}
                <ellipse
                  cx="150"
                  cy="160"
                  rx="104"
                  ry="16"
                  fill={theme.cake.frosting}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                {/* Frosting Drips / Scallops */}
                <path
                  d="M 46 160
                     C 55 174, 65 174, 75 162
                     C 85 176, 98 176, 110 163
                     C 122 178, 138 178, 150 164
                     C 162 178, 178 178, 190 163
                     C 202 176, 215 176, 225 162
                     C 235 174, 245 174, 254 160"
                  fill={theme.cake.frosting}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                {/* Decorative bottom dots / beads */}
                {Array.from({ length: 9 }).map((_, i) => (
                  <circle
                    key={`bdot-${i}`}
                    cx={65 + i * 21}
                    cy={198 + Math.sin((i / 8) * Math.PI) * 7}
                    r="3.5"
                    fill={theme.cake.accent}
                    opacity="0.85"
                  />
                ))}
              </g>

              {/* Top Tier */}
              <g id="top-tier">
                {/* Top tier base body */}
                <path
                  d="M 80 108 L 80 148 C 80 160 220 160 220 148 L 220 108 Z"
                  fill={theme.cake.base}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                {/* Top tier frosting top surface */}
                <ellipse
                  cx="150"
                  cy="108"
                  rx="70"
                  ry="12"
                  fill={theme.cake.frosting}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                {/* Top tier Frosting Scallops */}
                <path
                  d="M 80 108
                     C 90 120, 102 120, 114 110
                     C 126 122, 140 122, 150 111
                     C 160 122, 174 122, 186 110
                     C 198 120, 210 120, 220 108"
                  fill={theme.cake.frosting}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />

                {/* Topping Decorations */}
                {theme.cake.topping === "cherries" && (
                  <>
                    <circle cx="86" cy="106" r="5" fill="#c92a2a" />
                    <circle cx="120" cy="111" r="5" fill="#c92a2a" />
                    <circle cx="180" cy="111" r="5" fill="#c92a2a" />
                    <circle cx="214" cy="106" r="5" fill="#c92a2a" />
                  </>
                )}
                {theme.cake.topping === "stars" && (
                  <>
                    <polygon
                      points="76,101 78,105 82,105 79,107 80,111 76,108 72,111 73,107 70,105 74,105"
                      fill="#ffd43b"
                    />
                    <polygon
                      points="224,101 226,105 230,105 227,107 228,111 224,108 220,111 221,107 218,105 222,105"
                      fill="#ffd43b"
                    />
                  </>
                )}
                {theme.cake.topping === "flowers" && (
                  <>
                    <circle cx="86" cy="106" r="4.5" fill={theme.palette.primary} />
                    <circle cx="86" cy="106" r="2" fill={theme.palette.accent} />
                    <circle cx="214" cy="106" r="4.5" fill={theme.palette.primary} />
                    <circle cx="214" cy="106" r="2" fill={theme.palette.accent} />
                  </>
                )}
                {theme.cake.topping === "strawberries" && (
                  <>
                    <path d="M 83 103 Q 86 110 89 103 Z" fill="#e03131" />
                    <path d="M 211 103 Q 214 110 217 103 Z" fill="#e03131" />
                  </>
                )}
                {theme.cake.topping === "sprinkles" && (
                  <>
                    <rect x="88" y="104" width="7" height="2.5" rx="1.2" transform="rotate(25 91 105)" fill="#e03131" />
                    <rect x="110" y="108" width="7" height="2.5" rx="1.2" transform="rotate(-30 113 109)" fill="#ffd43b" />
                    <rect x="132" y="105" width="7" height="2.5" rx="1.2" transform="rotate(45 135 106)" fill="#40c057" />
                    <rect x="162" y="106" width="7" height="2.5" rx="1.2" transform="rotate(-15 165 107)" fill="#228be6" />
                    <rect x="185" y="109" width="7" height="2.5" rx="1.2" transform="rotate(35 188 110)" fill="#f06595" />
                    <rect x="206" y="104" width="7" height="2.5" rx="1.2" transform="rotate(-40 209 105)" fill="#fd7e14" />
                  </>
                )}
              </g>
            </>
          ) : (
            /* ================= 3-TIER CAKE ================= */
            <>
              {/* Bottom Tier (3-tier) */}
              <g id="bottom-tier-3">
                <path
                  d="M 46 172 L 46 210 C 46 226 254 226 254 210 L 254 172 Z"
                  fill={theme.cake.base}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                <ellipse
                  cx="150"
                  cy="172"
                  rx="104"
                  ry="15"
                  fill={theme.cake.frosting}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                <path
                  d="M 46 172
                     C 55 184, 65 184, 75 174
                     C 85 186, 98 186, 110 175
                     C 122 188, 138 188, 150 176
                     C 162 188, 178 188, 190 175
                     C 202 186, 215 186, 225 174
                     C 235 184, 245 184, 254 172"
                  fill={theme.cake.frosting}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                {Array.from({ length: 9 }).map((_, i) => (
                  <circle
                    key={`bdot3-${i}`}
                    cx={65 + i * 21}
                    cy={198 + Math.sin((i / 8) * Math.PI) * 7}
                    r="3"
                    fill={theme.cake.accent}
                    opacity="0.85"
                  />
                ))}
              </g>

              {/* Middle Tier (3-tier) */}
              <g id="middle-tier-3">
                <path
                  d="M 74 126 L 74 162 C 74 172 226 172 226 162 L 226 126 Z"
                  fill={theme.cake.base}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                <ellipse
                  cx="150"
                  cy="126"
                  rx="76"
                  ry="12"
                  fill={theme.cake.frosting}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                <path
                  d="M 74 126
                     C 84 137, 96 137, 108 128
                     C 120 139, 134 139, 150 128
                     C 166 139, 180 139, 192 128
                     C 204 137, 216 137, 226 126"
                  fill={theme.cake.frosting}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                {Array.from({ length: 7 }).map((_, i) => (
                  <circle
                    key={`mdot3-${i}`}
                    cx={92 + i * 19}
                    cy={150 + Math.sin((i / 6) * Math.PI) * 5}
                    r="2.5"
                    fill={theme.cake.accent}
                    opacity="0.85"
                  />
                ))}
              </g>

              {/* Top Tier (3-tier) */}
              <g id="top-tier-3">
                <path
                  d="M 104 80 L 104 116 C 104 125 196 125 196 116 L 196 80 Z"
                  fill={theme.cake.base}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                <ellipse
                  cx="150"
                  cy="80"
                  rx="46"
                  ry="9"
                  fill={theme.cake.frosting}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />
                <path
                  d="M 104 80
                     C 112 88, 122 88, 132 82
                     C 142 90, 158 90, 168 82
                     C 178 88, 188 88, 196 80"
                  fill={theme.cake.frosting}
                  stroke={theme.palette.border}
                  strokeWidth="1.5"
                />

                {/* Topping Decorations for 3-tier */}
                {theme.cake.topping === "cherries" && (
                  <>
                    <circle cx="110" cy="79" r="4.5" fill="#c92a2a" />
                    <circle cx="150" cy="84" r="4.5" fill="#c92a2a" />
                    <circle cx="190" cy="79" r="4.5" fill="#c92a2a" />
                  </>
                )}
                {theme.cake.topping === "stars" && (
                  <>
                    <polygon
                      points="110,75 112,79 116,79 113,81 114,85 110,82 106,85 107,81 104,79 108,79"
                      fill="#ffd43b"
                    />
                    <polygon
                      points="190,75 192,79 196,79 193,81 194,85 190,82 186,85 187,81 184,79 188,79"
                      fill="#ffd43b"
                    />
                  </>
                )}
                {theme.cake.topping === "flowers" && (
                  <>
                    <circle cx="110" cy="79" r="4" fill={theme.palette.primary} />
                    <circle cx="110" cy="79" r="1.8" fill={theme.palette.accent} />
                    <circle cx="190" cy="79" r="4" fill={theme.palette.primary} />
                    <circle cx="190" cy="79" r="1.8" fill={theme.palette.accent} />
                  </>
                )}
                {theme.cake.topping === "strawberries" && (
                  <>
                    <path d="M 107 76 Q 110 83 113 76 Z" fill="#e03131" />
                    <path d="M 187 76 Q 190 83 193 76 Z" fill="#e03131" />
                  </>
                )}
                {theme.cake.topping === "sprinkles" && (
                  <>
                    <rect x="112" y="78" width="6" height="2" rx="1" transform="rotate(25 115 79)" fill="#e03131" />
                    <rect x="126" y="81" width="6" height="2" rx="1" transform="rotate(-30 129 82)" fill="#ffd43b" />
                    <rect x="142" y="80" width="6" height="2" rx="1" transform="rotate(45 145 81)" fill="#40c057" />
                    <rect x="156" y="81" width="6" height="2" rx="1" transform="rotate(-20 159 82)" fill="#228be6" />
                    <rect x="172" y="82" width="6" height="2" rx="1" transform="rotate(35 175 83)" fill="#f06595" />
                    <rect x="184" y="78" width="6" height="2" rx="1" transform="rotate(-35 187 79)" fill="#fd7e14" />
                  </>
                )}
              </g>
            </>
          )}

          {/* Candles and Flames */}
          {candlePositions.map((cx, idx) => {
            const candleWidth = count >= 6 ? 5.5 : 7;
            const candleRadius = count >= 6 ? 1.5 : 2;
            const halfW = candleWidth / 2;
            const candleColor = idx % 2 === 0 ? theme.palette.primary : theme.cake.accent;
            const glowRadius = count <= 2 ? 14 : count <= 4 ? 11 : count <= 5 ? 8.5 : 6.5;
            const glowOpacity = count > 4 ? 0.55 : reduce ? 0.5 : 0.8;
            const flameScale = count >= 6 ? 0.8 : count >= 5 ? 0.9 : 1;
            const normX = count > 1 ? Math.abs(cx - 150) / (candleSpan / 2) : 0;
            const curveOffset = Math.round((1 - normX * normX) * (isThreeTier ? 2.5 : 4) * 10) / 10;
            const candleY = topY + curveOffset;

            return (
              <g key={`candle-${idx}`} id={`candle-${idx}`}>
                {/* Candle Stick */}
                <rect
                  x={cx - halfW}
                  y={candleY}
                  width={candleWidth}
                  height={candleHeight}
                  rx={candleRadius}
                  fill="#ffffff"
                  stroke={theme.palette.border}
                  strokeWidth="0.8"
                />
                {/* Spiral Stripes on Candle */}
                <path
                  d={`M ${cx - halfW} ${candleY + 6} L ${cx + halfW} ${candleY + 11}
                      M ${cx - halfW} ${candleY + 15} L ${cx + halfW} ${candleY + 20}
                      ${!isThreeTier ? `M ${cx - halfW} ${candleY + 24} L ${cx + halfW} ${candleY + 29}` : ""}`}
                  stroke={candleColor}
                  strokeWidth={count >= 6 ? "1.8" : "2.2"}
                  strokeLinecap="round"
                  opacity="0.85"
                />

                {/* Candle Wick */}
                <line
                  x1={cx}
                  y1={candleY}
                  x2={cx}
                  y2={candleY - 5}
                  stroke="#495057"
                  strokeWidth="1.2"
                />

                {/* Flame / Glow Effect */}
                {!blownOut ? (
                  <g className="origin-bottom">
                    {/* Radial Flame Glow Halo */}
                    <circle
                      cx={cx}
                      cy={candleY - 12}
                      r={glowRadius}
                      fill={`url(#${idPrefix}-flame-glow)`}
                      opacity={glowOpacity}
                    />

                    {/* Flickering SVG Flame (Grouped Flame Tear + Core) */}
                    <motion.g
                      animate={
                        still
                          ? undefined
                          : {
                              scaleY: [1, 1.15, 0.92, 1.1, 1],
                              scaleX: [1, 0.9, 1.1, 0.95, 1],
                              rotate: [-2, 3, -1, 2, -2],
                            }
                      }
                      transition={
                        still
                          ? undefined
                          : {
                              duration: 0.65 + (idx % 3) * 0.1,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }
                      }
                      style={{
                        transformOrigin: `${cx}px ${candleY - 5}px`,
                      }}
                    >
                      <path
                        d={`M ${cx} ${candleY - 22}
                            C ${cx + 5 * flameScale} ${candleY - 14}, ${cx + 5 * flameScale} ${candleY - 7}, ${cx} ${candleY - 5}
                            C ${cx - 5 * flameScale} ${candleY - 7}, ${cx - 5 * flameScale} ${candleY - 14}, ${cx} ${candleY - 22} Z`}
                        fill="#ffd43b"
                        stroke="#ff922b"
                        strokeWidth="0.7"
                      />
                      <ellipse cx={cx} cy={candleY - 10} rx={1.8 * flameScale} ry={3.8 * flameScale} fill="#ffffff" />
                    </motion.g>
                  </g>
                ) : (
                  /* Smoke Wisps after blowout */
                  <motion.g
                    initial={still ? false : { opacity: 0.9, y: 0 }}
                    animate={still ? { opacity: 0.45, y: -6 } : { opacity: 0, y: -24 }}
                    transition={still ? { duration: 0 } : { duration: 1.8, delay: idx * 0.1, ease: "easeOut" }}
                  >
                    <path
                      d={`M ${cx} ${candleY - 6} Q ${cx - 4} ${candleY - 14} ${cx + 2} ${candleY - 22} T ${cx - 2} ${candleY - 32}`}
                      fill="none"
                      stroke="#adb5bd"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                  </motion.g>
                )}
              </g>
            );
          })}
        </svg>
      </button>

      {/* Action Prompt / Badge */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-center">
        {!blownOut ? (
          <button
            type="button"
            onClick={handleBlowOut}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold shadow-sm transition hover:shadow active:scale-95 cursor-pointer"
            style={{
              background: theme.palette.primary,
              color: theme.palette.surface,
            }}
          >
            <span>{ctaLabel}</span>
          </button>
        ) : (
          <>
            <motion.div
              initial={still ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={still ? { duration: 0 } : undefined}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold"
              style={{
                background: theme.palette.surface,
                color: theme.palette.primary,
                border: `1px solid ${theme.palette.border}`,
              }}
            >
              <span>Wish made! Happy Birthday!</span>
            </motion.div>
            {canRelight && (
              <button
                type="button"
                onClick={handleRelight}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition hover:opacity-85 cursor-pointer"
                style={{
                  background: "transparent",
                  color: theme.palette.mutedText,
                  border: `1px solid ${theme.palette.border}`,
                }}
              >
                Relight candles
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
