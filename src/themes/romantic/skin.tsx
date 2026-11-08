"use client";

import type { CSSProperties } from "react";
import type { ThemeSkinProps } from "@/themes/types";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
const cv = (d: CSSProperties & Record<`--${string}`, string | number>): Vars => d as Vars;

interface HeartSpec { x: number; y: number; s: number; r: number; delay: number; d: number; tone: string }
interface BloomSpec { x: number; y: number; s: number; r: number; petal: string; core: string }

const HEARTS: HeartSpec[] = [
  { x: 6, y: 20, s: 30, r: -14, delay: 0, d: 3, tone: "var(--t-secondary)" },
  { x: 19, y: 68, s: 18, r: 11, delay: 1.6, d: 4, tone: "var(--t-primary)" },
  { x: 34, y: 30, s: 13, r: -5, delay: 0.7, d: 2, tone: "var(--t-accent)" },
  { x: 48, y: 80, s: 22, r: 16, delay: 2.4, d: 5, tone: "var(--t-secondary)" },
  { x: 67, y: 16, s: 16, r: 4, delay: 1.1, d: 3, tone: "var(--t-primary)" },
  { x: 81, y: 58, s: 27, r: -12, delay: 0.3, d: 4, tone: "var(--t-secondary)" },
  { x: 92, y: 33, s: 20, r: 8, delay: 2.9, d: 5, tone: "var(--t-accent)" },
];

const OPENING_BLOOMS: BloomSpec[] = [
  { x: 50, y: 15, s: 58, r: 4, petal: "var(--t-primary)", core: "var(--t-accent)" },
  { x: 41, y: 29, s: 52, r: -8, petal: "var(--t-secondary)", core: "var(--t-surface)" },
  { x: 60, y: 27, s: 48, r: 12, petal: "var(--t-secondary)", core: "var(--t-accent)" },
  { x: 31, y: 41, s: 38, r: 18, petal: "var(--t-accent)", core: "var(--t-surface)" },
  { x: 69, y: 40, s: 36, r: -20, petal: "var(--t-primary)", core: "var(--t-surface)" },
  { x: 38, y: 53, s: 32, r: -14, petal: "var(--t-secondary)", core: "var(--t-accent)" },
];

const CLOSING_BLOOMS: BloomSpec[] = [
  ...OPENING_BLOOMS.slice(0, 3),
  { x: 62, y: 48, s: 34, r: 9, petal: "var(--t-secondary)", core: "var(--t-surface)" },
  { x: 22, y: 52, s: 30, r: 22, petal: "var(--t-secondary)", core: "var(--t-accent)" },
  { x: 78, y: 50, s: 28, r: -18, petal: "var(--t-accent)", core: "var(--t-surface)" },
  { x: 50, y: 68, s: 26, r: 6, petal: "var(--t-primary)", core: "var(--t-surface)" },
];

const PETALS = [
  { x: 9, s: 13, dx: 30, dur: 19, delay: 0 },
  { x: 23, s: 9, dx: -24, dur: 23, delay: 3 },
  { x: 41, s: 15, dx: 18, dur: 17, delay: 6 },
  { x: 63, s: 10, dx: -32, dur: 21, delay: 1.5 },
  { x: 86, s: 12, dx: 26, dur: 25, delay: 4.5 },
];

const HALO = Array.from({ length: 11 }, (_, i) => {
  const a = (i / 11) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + Math.cos(a) * 27, y: 50 + Math.sin(a) * 21, s: i % 3 === 0 ? 20 : 12, delay: i * 0.33 };
});

const STEMS = ["M100 118C97 96 86 78 62 62", "M100 118C101 94 100 72 100 44", "M100 118C104 96 115 78 139 62", "M100 118C94 94 78 78 52 78", "M100 118C107 93 122 78 148 78"];
const DECKLE_TOP = "M0 0H400V18c-12 8-22-4-34 1s-22 10-34 3-22-8-34-1-22 9-34 2-22-7-34-1-22 9-34 3-22-8-34-2-22 9-34 3-22-7-34-1-22 8-34 2S12 22 0 17Z";
const DECKLE_BOTTOM = "M0 44H400V26c-12-8-22 4-34-1s-22-10-34-3-22 8-34 1-22-9-34-2-22 7-34 1-22-8-34-2-22-9-34-3-22 8-34 2-22-9-34-3-22 7-34 1-22-8-34-2S12 22 0 27Z";

function Heart({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 20.7C6.3 16.9 2.7 13.5 2.7 9.7 2.7 7 4.9 4.8 7.5 4.8c1.7 0 3.2.8 4.2 2.2.9-1.4 2.5-2.2 4.2-2.2 2.6 0 4.8 2.2 4.8 4.9 0 3.8-3.6 7.2-9.3 11z" />
    </svg>
  );
}

function Blossom({ size, petal, core }: { size: number; petal: string; core: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="20" cy="10.2" rx="6.6" ry="9.8" fill={petal} opacity="0.88" transform={`rotate(${a} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="4" fill={core} opacity="0.92" />
    </svg>
  );
}

function FloatingHeart({ spec, paused, dim }: { spec: HeartSpec; paused: boolean; dim: number }) {
  const anim = paused
    ? { animation: "none", transform: `rotate(${spec.r}deg)` }
    : cv({ animation: `cc-float ${8 + spec.d}s ease-in-out ${spec.delay}s infinite`, "--r": `${spec.r}deg`, "--float-y": `${8 + spec.s / 3}px` });
  return (
    <div className="absolute" style={{ left: `calc(${spec.x}% - ${spec.s / 2}px)`, top: `calc(${spec.y}% - ${spec.s / 2}px)`, color: spec.tone, opacity: dim, ...anim }}>
      <Heart size={spec.s} />
    </div>
  );
}

function Bouquet({ mode, paused }: { mode: "opening" | "closing"; paused: boolean }) {
  const blooms = mode === "closing" ? CLOSING_BLOOMS : OPENING_BLOOMS;
  return (
    <div className="absolute bottom-0 left-1/2 h-[46%] w-[min(86vw,520px)] -translate-x-1/2">
      <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full" fill="none" preserveAspectRatio="xMidYMax meet">
        {STEMS.map((d) => (
          <path key={d} d={d} stroke="var(--t-primary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        ))}
        <path d="M92 118c2-13 4-24 8-34M108 118c-1-13-3-24-8-34" stroke="var(--t-primary)" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      </svg>
      {blooms.map((b) => (
        <div key={`${b.x}-${b.y}`} className="absolute" style={{ left: `calc(${b.x}% - ${b.s / 2}px)`, top: `calc(${b.y}% - ${b.s / 2}px)` }}>
          <div style={paused ? { animation: "none", transform: `rotate(${b.r}deg)` } : cv({ animation: `cc-sway ${7 + b.s / 12}s ease-in-out ${b.r / 6}s infinite`, "--r": `${b.r}deg` })}>
            <Blossom size={b.s} petal={b.petal} core={b.core} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Ribbon({ side, paused }: { side: "left" | "right"; paused: boolean }) {
  const flipped = side === "right";
  return (
    <svg viewBox="0 0 220 150" fill="none" className={`absolute h-[30vh] w-[54vw] ${flipped ? "-right-[10%] top-[3%]" : "-left-[12%] top-[48%]"}`} style={{ opacity: 0.62, transform: flipped ? "scaleX(-1)" : undefined }}>
      <path d="M-14 128C36 144 74 110 86 74c10-30 34-52 68-58" stroke="var(--t-secondary)" strokeWidth="9" strokeLinecap="round" opacity="0.42" />
      <path d="M-14 128C36 144 74 110 86 74c10-30 34-52 68-58" stroke="var(--t-surface)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 11" opacity="0.85" />
      <g style={paused ? { animation: "none" } : cv({ animation: "cc-sway 12s ease-in-out infinite", "--r": "-5deg", transformBox: "fill-box", transformOrigin: "center" })}>
        <path d="M140 16c11-11 28-10 36 2 7 10 0 21-12 23" stroke="var(--t-accent)" strokeWidth="4.5" strokeLinecap="round" opacity="0.48" />
        <circle cx="176" cy="30" r="4" fill="var(--t-accent)" opacity="0.5" />
      </g>
    </svg>
  );
}

function WaxHeart({ paused }: { paused: boolean }) {
  return (
    <div className="absolute left-1/2 top-1/2 h-[136px] w-[136px] -translate-x-1/2 -translate-y-1/2">
      <div className="absolute inset-0" style={paused ? { animation: "none" } : cv({ animation: "cc-breathe 9s ease-in-out infinite", transformOrigin: "center" })}>
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 34% 28%, #f8d3e3 0%, var(--t-secondary) 58%, #a9557f 100%)", boxShadow: "0 16px 34px -18px rgba(123, 63, 160, 0.7)" }} />
        <div className="absolute inset-[11px] rounded-full border" style={{ borderColor: "rgba(255, 255, 255, 0.5)" }} />
        <div className="absolute inset-[19px] rounded-full border border-dashed" style={{ borderColor: "rgba(255, 255, 255, 0.32)" }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: "var(--t-surface)", opacity: 0.92 }}>
          <Heart size={44} />
        </div>
      </div>
    </div>
  );
}

function Deckle({ edge }: { edge: "top" | "bottom" }) {
  return (
    <svg viewBox="0 0 400 44" preserveAspectRatio="none" className={`absolute inset-x-0 h-[44px] w-full ${edge === "top" ? "top-0" : "bottom-0"}`}>
      <path d={edge === "top" ? DECKLE_TOP : DECKLE_BOTTOM} fill="var(--t-surface)" opacity="0.86" />
    </svg>
  );
}

export default function Skin({ sceneId, focus = 0, paused = false, className }: ThemeSkinProps) {
  const scene = sceneId ?? "opening";
  const dim = 1 - Math.min(0.4, Math.max(0, focus) * 0.4);
  const sealed = scene === "envelope";
  const letter = scene === "letter";
  const memory = scene === "memory";
  const answering = scene === "response";
  const bouquet = scene === "opening" || scene === "closing";

  return (
    <div className={["pointer-events-none absolute inset-0 overflow-hidden", className].filter(Boolean).join(" ")} aria-hidden>
      <div className="absolute inset-0" style={{ background: "var(--t-bg)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(126% 96% at 50% -6%, #fdf8ff 0%, var(--t-bg) 44%, var(--t-bg-alt) 100%)", opacity: dim }} />
      <div
        className="absolute left-1/2 top-1/2 h-[76vh] w-[76vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--t-secondary), transparent 72%)", opacity: 0.24 * dim, ...(paused ? { animation: "none" } : cv({ animation: "cc-breathe 14s ease-in-out infinite" })) }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(112% 88% at 50% 44%, transparent 42%, var(--t-bg-alt) 100%)", opacity: 0.55 }} />

      {(scene === "opening" || sealed || scene === "closing") && <Ribbon side="left" paused={paused} />}
      {(sealed || scene === "closing") && <Ribbon side="right" paused={paused} />}

      <div style={{ opacity: letter || answering ? 0.55 * dim : dim }}>
        {HEARTS.map((spec) => (
          <FloatingHeart key={`${spec.x}-${spec.y}`} spec={spec} paused={paused} dim={spec.tone === "var(--t-accent)" ? 0.75 : 0.9} />
        ))}
      </div>

      {bouquet && <Bouquet mode={scene === "closing" ? "closing" : "opening"} paused={paused} />}

      {letter && (
        <>
          <Deckle edge="top" />
          <Deckle edge="bottom" />
        </>
      )}

      {(letter || memory || scene === "closing") && (
        <div className="absolute inset-0">
          {PETALS.map((petal) => {
            const body = { left: `${petal.x}%`, width: petal.s, height: petal.s * 1.35, borderRadius: "62% 62% 48% 48% / 74% 74% 38% 38%", background: "var(--t-secondary)", opacity: 0.7 };
            const anim = paused ? { animation: "none" } : cv({ animation: `cc-rise ${petal.dur}s linear ${petal.delay}s infinite`, "--dx": `${petal.dx}px`, "--o": 0.72 });
            return <div key={petal.x} className="absolute bottom-[6%]" style={{ ...body, ...anim }} />;
          })}
        </div>
      )}
      {sealed && <WaxHeart paused={paused} />}
      {memory && (
        <svg className="absolute inset-x-0 top-[8%] h-[16vh] w-full" viewBox="0 0 400 90" fill="none" preserveAspectRatio="none">
          <path d="M-10 26C70 66 120 4 200 34s130 40 210 2" stroke="var(--t-border)" strokeWidth="1.2" opacity="0.9" />
          {[60, 112, 168, 226, 284, 338].map((x, i) => (
            <g key={x} transform={`translate(${x} ${i % 2 === 0 ? 30 + ((i * 4) % 14) : 34 - ((i * 3) % 12)})`}>
              <line x1="0" y1="-26" x2="0" y2="0" stroke="var(--t-border)" strokeWidth="0.8" />
              <path d="M12 20.7C6.3 16.9 2.7 13.5 2.7 9.7 2.7 7 4.9 4.8 7.5 4.8c1.7 0 3.2.8 4.2 2.2.9-1.4 2.5-2.2 4.2-2.2 2.6 0 4.8 2.2 4.8 4.9 0 3.8-3.6 7.2-9.3 11z" transform="translate(-9 0) scale(0.78)" fill="var(--t-secondary)" />
            </g>
          ))}
        </svg>
      )}
      {answering && (
        <div className="absolute left-1/2 top-1/2 h-[54vh] w-[54vh] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(closest-side, var(--t-secondary), transparent 74%)", opacity: 0.3 }} />
          <div className="absolute inset-[12%] rounded-full border" style={{ borderColor: "var(--t-border)", opacity: 0.7 }} />
          {HALO.map((spot) => {
            const anim = paused ? { animation: "none", opacity: 0.65 } : cv({ animation: `cc-twinkle ${4 + (spot.s % 3)}s ease-in-out ${spot.delay}s infinite` });
            return (
              <div key={`${spot.x}-${spot.y}`} className="absolute" style={{ left: `calc(${spot.x}% - ${spot.s / 2}px)`, top: `calc(${spot.y}% - ${spot.s / 2}px)`, color: "var(--t-primary)", ...anim }}>
                <Heart size={spot.s} />
              </div>
            );
          })}
        </div>
      )}
      <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, rgba(123, 63, 160, 0.035) 0 1px, transparent 1px 3px)", opacity: 0.5 }} />
    </div>
  );
}
