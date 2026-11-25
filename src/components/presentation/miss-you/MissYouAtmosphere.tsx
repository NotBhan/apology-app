"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import type { MissYouTheme } from "@/experiences/miss-you/themes";

interface MissYouAtmosphereProps {
  theme: MissYouTheme;
  paused?: boolean;
}

function pseudo(seed: number): number {
  const x = Math.sin(seed * 19.31 + 43.17) * 29471.53;
  return x - Math.floor(x);
}

/**
 * Ambient decorative layer for I Miss You.
 *
 * Strictly `aria-hidden` and `pointer-events-none`, rendering zero text or
 * interactive controls. Pauses CSS ambient motion when `paused` or reduced motion
 * is requested.
 */
export function MissYouAtmosphere({ theme, paused = false }: MissYouAtmosphereProps) {
  const reduce = useReducedMotion();
  const still = reduce || paused;
  const motif = theme.atmosphere.motif;

  const nodes = useMemo(() => {
    return Array.from({ length: 14 }, (_, idx) => ({
      id: idx,
      x: Math.round(pseudo(idx * 3 + 1) * 94 * 10) / 10,
      y: Math.round(pseudo(idx * 5 + 2) * 90 * 10) / 10,
      delay: Math.round((idx % 7) * 0.45 * 100) / 100,
      duration: Math.round((4.5 + (idx % 5) * 0.9) * 100) / 100,
      scale: Math.round((0.75 + (idx % 4) * 0.18) * 100) / 100,
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Subtle radial glow tuned to the theme */}
      <div
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl opacity-35"
        style={{ background: theme.palette.primary }}
      />
      <div
        className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full blur-3xl opacity-25"
        style={{ background: theme.palette.secondary }}
      />

      {motif === "rain" && (
        <div className="absolute inset-0 opacity-35">
          {nodes.map((drop) => (
            <span
              key={drop.id}
              className="absolute block w-px rounded-full"
              style={{
                left: `${drop.x}%`,
                top: `${drop.y}%`,
                height: `${Math.round(18 * drop.scale)}px`,
                background: `linear-gradient(180deg, transparent, ${theme.palette.secondary})`,
                animation: still ? "none" : `cc-float ${drop.duration}s ease-in-out ${drop.delay}s infinite`,
                opacity: 0.55,
              }}
            />
          ))}
        </div>
      )}

      {motif === "constellation" && (
        <svg viewBox="0 0 400 700" className="h-full w-full opacity-55" preserveAspectRatio="xMidYMid slice">
          <path
            d="M70,120 L140,180 L230,145 L310,210 M95,490 L185,530 L285,480"
            fill="none"
            stroke={theme.palette.secondary}
            strokeWidth="0.7"
            strokeDasharray="3 5"
            opacity="0.35"
          />
          {nodes.map((star) => (
            <circle
              key={star.id}
              cx={Math.round(star.x * 4 * 10) / 10}
              cy={Math.round(star.y * 7 * 10) / 10}
              r={Math.round((1.1 + (star.id % 3) * 0.7) * 10) / 10}
              fill={star.id % 3 === 0 ? theme.palette.accent : theme.palette.secondary}
              style={{
                animation: still ? "none" : `cc-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
              }}
            />
          ))}
        </svg>
      )}

      {motif === "airmail" && (
        <div className="absolute inset-0">
          {/* Top & bottom subtle airmail stripe edges */}
          <div
            className="absolute inset-x-0 top-0 h-1.5 opacity-30"
            style={{
              background: `repeating-linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.primary} 12px, transparent 12px, transparent 22px, ${theme.palette.accent} 22px, ${theme.palette.accent} 34px, transparent 34px, transparent 44px)`,
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1.5 opacity-30"
            style={{
              background: `repeating-linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.primary} 12px, transparent 12px, transparent 22px, ${theme.palette.accent} 22px, ${theme.palette.accent} 34px, transparent 34px, transparent 44px)`,
            }}
          />
          {nodes.slice(0, 7).map((mote) => (
            <span
              key={mote.id}
              className="absolute block h-2 w-2 rounded-full opacity-25"
              style={{
                left: `${mote.x}%`,
                top: `${mote.y}%`,
                background: mote.id % 2 === 0 ? theme.palette.primary : theme.palette.accent,
                animation: still ? "none" : `cc-float ${mote.duration + 2}s ease-in-out ${mote.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {motif === "coffee-steam" && (
        <svg viewBox="0 0 400 700" className="h-full w-full opacity-35" preserveAspectRatio="xMidYMid slice">
          {[110, 200, 290].map((cx, i) => (
            <path
              key={cx}
              d={`M${cx},580 Q${cx - 18},510 ${cx + 8},440 T${cx - 6},300`}
              fill="none"
              stroke={theme.palette.accent}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={Math.round((0.35 - i * 0.06) * 100) / 100}
              style={{
                animation: still ? "none" : `cc-float ${6 + i}s ease-in-out ${i * 0.7}s infinite`,
              }}
            />
          ))}
        </svg>
      )}

      {motif === "botanical" && (
        <svg viewBox="0 0 400 700" className="h-full w-full opacity-35" preserveAspectRatio="xMidYMid slice">
          <path
            d="M40,680 C70,560 45,440 85,330"
            fill="none"
            stroke={theme.palette.secondary}
            strokeWidth="1.5"
            opacity="0.45"
          />
          <path
            d="M360,40 C330,150 355,260 320,360"
            fill="none"
            stroke={theme.palette.secondary}
            strokeWidth="1.5"
            opacity="0.45"
          />
          {nodes.slice(0, 8).map((leaf) => (
            <ellipse
              key={leaf.id}
              cx={Math.round(leaf.x * 4 * 10) / 10}
              cy={Math.round(leaf.y * 7 * 10) / 10}
              rx={5}
              ry={2.2}
              fill={leaf.id % 2 === 0 ? theme.palette.primary : theme.palette.secondary}
              opacity="0.28"
              transform={`rotate(${leaf.id * 28} ${Math.round(leaf.x * 4 * 10) / 10} ${Math.round(leaf.y * 7 * 10) / 10})`}
              style={{
                animation: still ? "none" : `cc-sway ${leaf.duration + 1}s ease-in-out ${leaf.delay}s infinite`,
              }}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
