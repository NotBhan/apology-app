"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BirthdayTheme } from "@/experiences/birthday/themes";

interface BirthdayCelebrationProps {
  theme: BirthdayTheme;
  burst?: boolean;
  className?: string;
}

interface ParticleSpec {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  duration: number;
  delay: number;
  shape: "rect" | "circle" | "star" | "petal" | "balloon";
}

function pseudo(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function BirthdayCelebration({
  theme,
  burst = false,
  className = "",
}: BirthdayCelebrationProps) {
  const reduce = useReducedMotion();

  const particles = useMemo(() => {
    const palette = [
      theme.palette.primary,
      theme.palette.secondary,
      theme.palette.accent,
      theme.envelope.accent,
      theme.cake.accent,
    ];

    const count = burst ? 36 : 18;
    const kind = theme.decorations.ambientParticles;

    const items: ParticleSpec[] = [];
    for (let i = 0; i < count; i++) {
      const color = palette[i % palette.length];
      const shape: ParticleSpec["shape"] =
        kind === "stars" || kind === "sparkles"
          ? "star"
          : kind === "petals"
            ? "petal"
            : kind === "balloons"
              ? i % 4 === 0
                ? "balloon"
                : "circle"
              : i % 3 === 0
                ? "circle"
                : i % 3 === 1
                  ? "star"
                  : "rect";

      const r1 = pseudo(i * 3 + 1);
      const r2 = pseudo(i * 7 + 2);
      const r3 = pseudo(i * 11 + 5);

      items.push({
        id: i,
        x: Math.round(r1 * 1000) / 10,
        y: Math.round((burst ? 45 + (r2 * 30 - 15) : r2 * 95) * 10) / 10,
        size: kind === "balloons" && shape === "balloon" ? 22 + (i % 3) * 6 : 8 + (i % 4) * 4,
        color,
        rotation: Math.floor(r3 * 360),
        duration: burst ? 2.4 + (i % 5) * 0.4 : 5 + (i % 6) * 1.2,
        delay: burst ? (i % 12) * 0.04 : (i % 8) * 0.5,
        shape,
      });
    }
    return items;
  }, [theme, burst]);

  if (reduce) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {particles.map((p) => {
        const r4 = pseudo(p.id * 13 + 7);
        const r5 = pseudo(p.id * 17 + 9);
        const xOffset = burst ? (p.x - 50) * 3 : Math.round((r4 - 0.5) * 40 * 10) / 10;
        const yOffset = burst ? Math.round((-120 - r5 * 180) * 10) / 10 : 50;

        return (
          <motion.div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
            initial={{
              opacity: burst ? 0 : 0.4,
              scale: burst ? 0.3 : 1,
              x: 0,
              y: 0,
              rotate: p.rotation,
            }}
            animate={
              burst
                ? {
                    opacity: [0, 0.95, 0.8, 0],
                    scale: [0.3, 1.2, 1, 0.6],
                    x: [0, xOffset, xOffset * 1.2],
                    y: [0, yOffset, yOffset + 240],
                    rotate: p.rotation + 360,
                  }
                : {
                    opacity: [0.3, 0.7, 0.3],
                    y: [0, yOffset, 0],
                    rotate: [p.rotation, p.rotation + 45, p.rotation],
                  }
            }
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: burst ? 0 : Infinity,
              ease: burst ? "easeOut" : "easeInOut",
            }}
          >
            {p.shape === "star" ? (
              <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill={p.color}>
                <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
              </svg>
            ) : p.shape === "petal" ? (
              <svg width={p.size} height={p.size * 1.4} viewBox="0 0 16 24" fill={p.color}>
                <path d="M8 0C2 8 0 16 8 24C16 16 14 8 8 0Z" opacity="0.85" />
              </svg>
            ) : p.shape === "balloon" ? (
              <svg width={p.size} height={p.size * 1.5} viewBox="0 0 24 36" fill={p.color}>
                <ellipse cx="12" cy="14" rx="10" ry="13" />
                <polygon points="12,27 9,30 15,30" opacity="0.9" />
                <path
                  d="M12 30 Q10 33 12 36"
                  stroke={theme.palette.text}
                  strokeWidth="1"
                  fill="none"
                  opacity="0.4"
                />
              </svg>
            ) : p.shape === "circle" ? (
              <div
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  borderRadius: "9999px",
                  background: p.color,
                }}
              />
            ) : (
              <div
                style={{
                  width: `${p.size}px`,
                  height: `${p.size * 0.6}px`,
                  borderRadius: "2px",
                  background: p.color,
                }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
